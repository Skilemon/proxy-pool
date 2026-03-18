#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地 HTTP 隧道代理（自动验证 + 轮换代理）
- 启动时验证所有代理，只使用可用代理
- 每次请求轮换一个代理
- 可用代理耗尽后轮询
本地监听: 0.0.0.0:18080
验证目标: https://q.us-east-1.amazonaws.com/generateAssistantResponse
"""

import socket
import ssl
import socks
import threading
import time
import itertools
from concurrent.futures import ThreadPoolExecutor, as_completed
try:
    import geoip2.database
    _geoip_reader = None
    def _load_geoip(path="GeoLite2-Country.mmdb"):
        global _geoip_reader
        try:
            _geoip_reader = geoip2.database.Reader(path)
            return True
        except Exception:
            return False
    def is_cn_ip(ip):
        if _geoip_reader is None:
            return False
        try:
            return _geoip_reader.country(ip).country.iso_code == "CN"
        except Exception:
            return False
except ImportError:
    def _load_geoip(path=None): return False
    def is_cn_ip(ip): return False

LOCAL_HOST = "0.0.0.0"
LOCAL_PORT = 18080
TARGET_HOST = "q.us-east-1.amazonaws.com"
TARGET_PORT = 443
TARGET_PATH = "/generateAssistantResponse"
VERIFY_TIMEOUT = 10

def _load_proxies(path="proxies.txt"):
    import os
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), path)
    with open(p, encoding="utf-8") as f:
        seen = set()
        result = []
        for l in f:
            l = l.strip()
            if l and not l.startswith("#") and l not in seen:
                seen.add(l)
                result.append(l)
        return result

PROXIES = _load_proxies()

def verify_proxy(proxy_url):
    """验证代理：先建立 CONNECT 隧道，再完成 TLS 握手收到 HTTP 响应"""
    proxy_url = proxy_url.strip()
    try:
        addr = proxy_url.replace("socks5://", "")
        host, port = addr.split(":")
        port = int(port)
        # 第一步：CONNECT 隧道
        sock = socks.socksocket()
        sock.set_proxy(socks.SOCKS5, host, port)
        sock.settimeout(VERIFY_TIMEOUT)
        sock.connect((TARGET_HOST, TARGET_PORT))
        # 第二步：TLS 握手
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ssl_sock = ctx.wrap_socket(sock, server_hostname=TARGET_HOST)
        # 第三步：发送真实请求并等待响应头
        req = (
            f"POST {TARGET_PATH} HTTP/1.1\r\n"
            f"Host: {TARGET_HOST}\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: 2\r\n"
            "Connection: close\r\n\r\n{}"
        )
        ssl_sock.sendall(req.encode())
        resp = b""
        while b"\r\n" not in resp:
            chunk = ssl_sock.recv(1024)
            if not chunk:
                break
            resp += chunk
        ssl_sock.close()
        if not resp:
            return (proxy_url, False, "no response")
        status = resp.decode(errors='ignore').split('\r\n')[0]
        return (proxy_url, True, status)
    except Exception as e:
        return (proxy_url, False, str(e))

def get_valid_proxies():
    if _load_geoip():
        print("[*] GeoIP2 已加载，将过滤国内 IP")
    else:
        print("[!] GeoIP2 未加载（缺少 GeoLite2-Country.mmdb 或 geoip2 库），跳过国内 IP 过滤")
    candidates = []
    for p in PROXIES:
        ip = p.replace("socks5://", "").split(":")[0]
        if is_cn_ip(ip):
            print(f"  [CN] 跳过国内 IP: {p}")
        else:
            candidates.append(p)
    print(f"[*] 验证 {len(candidates)} 个代理，目标: https://{TARGET_HOST}{TARGET_PATH}")
    valid = []
    with ThreadPoolExecutor(max_workers=len(candidates)) as ex:
        futures = {ex.submit(verify_proxy, p): p for p in candidates}
        for f in as_completed(futures):
            url, ok, msg = f.result()
            if ok:
                valid.append(url)
                print(f"  [OK] {url}  {msg}")
            else:
                print(f"  [--] {url}  {str(msg)[:60]}")
    print(f"[*] 可用代理: {len(valid)}/{len(PROXIES)}")
    return valid

# 全局代理池
_proxy_cycle = None
_proxy_lock = threading.Lock()

_valid_proxies = []
_proxy_fail_count = {}
MAX_FAIL = 3

def _rebuild_cycle():
    global _proxy_cycle
    _proxy_cycle = itertools.cycle(_valid_proxies)

def get_next_proxy():
    with _proxy_lock:
        return next(_proxy_cycle)

def mark_proxy_fail(proxy_url):
    with _proxy_lock:
        _proxy_fail_count[proxy_url] = _proxy_fail_count.get(proxy_url, 0) + 1
        if _proxy_fail_count[proxy_url] >= MAX_FAIL and proxy_url in _valid_proxies:
            _valid_proxies.remove(proxy_url)
            print(f"[REMOVE] {proxy_url} 累计失败 {MAX_FAIL} 次，已剔除，剩余 {len(_valid_proxies)} 个")
            if _valid_proxies:
                _rebuild_cycle()
            else:
                print("[!] 所有代理均已失败，重新加载...")
                threading.Thread(target=_reload_proxies, daemon=True).start()

def _reload_proxies():
    global _proxy_fail_count
    print("[*] 重新验证代理列表...")
    new_valid = get_valid_proxies()
    with _proxy_lock:
        _valid_proxies.clear()
        _proxy_fail_count = {}
        _valid_proxies.extend(new_valid)
        if _valid_proxies:
            _rebuild_cycle()
            print(f"[*] 重新加载完成，可用代理 {len(_valid_proxies)} 个")
        else:
            print("[!] 重新加载后仍无可用代理")

def relay(src, dst):
    try:
        while True:
            data = src.recv(4096)
            if not data:
                break
            dst.sendall(data)
    except:
        pass
    finally:
        try: src.close()
        except: pass
        try: dst.close()
        except: pass

def handle_client(client_sock, addr):
    try:
        data = client_sock.recv(4096)
        if not data:
            return
        first_line = data.split(b'\r\n')[0].decode(errors='ignore')
        parts = first_line.split()
        if len(parts) < 3:
            return
        method, target, _ = parts[0], parts[1], parts[2]

        max_retries = 3
        if method == "CONNECT":
            host, port = target.split(":")
            port = int(port)
            tried = set()
            for attempt in range(max_retries):
                proxy_url = get_next_proxy()
                # 跳过本次请求已失败过的代理
                skip = 0
                while proxy_url in tried and skip < len(_valid_proxies):
                    proxy_url = get_next_proxy()
                    skip += 1
                tried.add(proxy_url)
                proxy_addr = proxy_url.replace("socks5://", "")
                proxy_host, proxy_port = proxy_addr.split(":")
                proxy_port = int(proxy_port)
                try:
                    remote = socks.socksocket()
                    remote.set_proxy(socks.SOCKS5, proxy_host, proxy_port)
                    remote.settimeout(5)
                    remote.connect((host, port))
                    client_sock.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                    print(f"[CONNECT] {target} via {proxy_url}")
                    t1 = threading.Thread(target=relay, args=(client_sock, remote), daemon=True)
                    t2 = threading.Thread(target=relay, args=(remote, client_sock), daemon=True)
                    t1.start()
                    t2.start()
                    t1.join()
                    t2.join()
                    return
                except Exception as e:
                    print(f"[RETRY {attempt+1}/{max_retries}] {target} via {proxy_url}: {e}")
                    try: remote.close()
                    except: pass
                    mark_proxy_fail(proxy_url)
            print(f"[FAIL] {target} 所有重试均失败")
            try: client_sock.sendall(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
            except: pass
        else:
            # HTTP 普通请求
            if target.startswith("http://"):
                url = target[7:]
                slash = url.find("/")
                host = url[:slash] if slash != -1 else url
                path = url[slash:] if slash != -1 else "/"
            else:
                host = target
                path = "/"
            port = 80
            if ":" in host:
                host, port = host.rsplit(":", 1)
                port = int(port)
            tried = set()
            for attempt in range(max_retries):
                proxy_url = get_next_proxy()
                skip = 0
                while proxy_url in tried and skip < len(_valid_proxies):
                    proxy_url = get_next_proxy()
                    skip += 1
                tried.add(proxy_url)
                proxy_addr = proxy_url.replace("socks5://", "")
                proxy_host, proxy_port = proxy_addr.split(":")
                proxy_port = int(proxy_port)
                try:
                    remote = socks.socksocket()
                    remote.set_proxy(socks.SOCKS5, proxy_host, proxy_port)
                    remote.settimeout(5)
                    remote.connect((host, port))
                    remote.sendall(data)
                    print(f"[HTTP] {method} {target} via {proxy_url}")
                    while True:
                        chunk = remote.recv(4096)
                        if not chunk:
                            break
                        client_sock.sendall(chunk)
                    remote.close()
                    return
                except Exception as e:
                    print(f"[RETRY {attempt+1}/{max_retries}] {target} via {proxy_url}: {e}")
                    try: remote.close()
                    except: pass
                    mark_proxy_fail(proxy_url)
            print(f"[FAIL] {target} 所有重试均失败")
            try: client_sock.sendall(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
            except: pass
    except Exception as e:
        print(f"[ERR] {addr}: {e}")
    finally:
        try: client_sock.close()
        except: pass

def main():
    global _proxy_cycle
    print("=" * 60)
    print("本地 HTTP 隧道代理 (自动验证 + 轮换)")
    print("=" * 60)
    valid = get_valid_proxies()
    if not valid:
        print("[!] 没有可用代理，退出")
        return
    _valid_proxies.extend(valid)
    _proxy_cycle = itertools.cycle(_valid_proxies)
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((LOCAL_HOST, LOCAL_PORT))
    server.listen(50)
    print(f"\n[*] 代理已启动: http://127.0.0.1:{LOCAL_PORT}")
    print(f"[*] 可用代理 {len(valid)} 个，每次请求自动轮换")
    print("[*] 按 Ctrl+C 停止\n")
    try:
        while True:
            client_sock, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(client_sock, addr), daemon=True)
            t.start()
    except KeyboardInterrupt:
        print("\n[*] 代理已停止")
    finally:
        server.close()

if __name__ == "__main__":
    main()
