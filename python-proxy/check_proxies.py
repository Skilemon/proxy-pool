#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
"""
多协议代理检测工具
支持协议：HTTP、HTTPS、SOCKS4、SOCKS5
验证目标：https://q.us-east-1.amazonaws.com/generateAssistantResponse
收到任意 HTTP 响应即视为可用
"""

import socket
import ssl
import socks
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from urllib.parse import urlparse

TARGET_HOST = "q.us-east-1.amazonaws.com"
TARGET_PORT = 443
TARGET_PATH = "/generateAssistantResponse"

import os as _os
_proxies_file = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "proxies.txt")
with open(_proxies_file, encoding="utf-8") as _f:
    PROXIES = [l.strip() for l in _f if l.strip() and not l.startswith("#")]

def parse_proxy_url(proxy_url):
    """
    解析代理 URL，返回协议类型、主机和端口
    支持格式：
    - http://host:port
    - https://host:port
    - socks4://host:port
    - socks5://host:port
    """
    proxy_url = proxy_url.strip()
    parsed = urlparse(proxy_url)
    scheme = parsed.scheme.lower()
    host = parsed.hostname
    port = parsed.port
    
    if not host or not port:
        raise ValueError(f"无效的代理 URL: {proxy_url}")
    
    scheme_to_type = {
        'http': socks.HTTP,
        'https': socks.HTTP,
        'socks4': socks.SOCKS4,
        'socks5': socks.SOCKS5
    }
    
    proxy_type = scheme_to_type.get(scheme)
    if proxy_type is None:
        raise ValueError(f"不支持的代理协议：{scheme}")
    
    return proxy_type, host, port, scheme

def test_proxy(proxy_url, timeout=10):
    """
    测试代理是否可用
    支持 HTTP、HTTPS、SOCKS4、SOCKS5 协议
    """
    proxy_url = proxy_url.strip()
    try:
        proxy_type, host, port, scheme = parse_proxy_url(proxy_url)
        
        sock = socks.socksocket()
        sock.set_proxy(proxy_type, host, port)
        sock.settimeout(timeout)
        start_time = time.time()
        sock.connect((TARGET_HOST, TARGET_PORT))
        
        ssl_sock = None
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            ssl_sock = ctx.wrap_socket(sock, server_hostname=TARGET_HOST)
            
            request = (
                f"POST {TARGET_PATH} HTTP/1.1\r\n"
                f"Host: {TARGET_HOST}\r\n"
                "Content-Type: application/json\r\n"
                "Content-Length: 2\r\n"
                "Connection: close\r\n"
                "\r\n"
                "{}"
            )
            ssl_sock.sendall(request.encode())
            
            response = b""
            while b"\r\n" not in response:
                chunk = ssl_sock.recv(1024)
                if not chunk:
                    break
                response += chunk
            
            response_time = time.time() - start_time
            status_line = response.decode(errors='ignore').split('\r\n')[0]
            return (proxy_url, True, response_time, status_line)
        finally:
            if ssl_sock:
                try: ssl_sock.close()
                except: pass
            try: sock.close()
            except: pass
    except Exception as e:
        return (proxy_url, False, None, str(e))

def main():
    print("=" * 70)
    print("多协议代理检测工具")
    print("支持协议：HTTP、HTTPS、SOCKS4、SOCKS5")
    print(f"验证目标：https://{TARGET_HOST}{TARGET_PATH}")
    print("=" * 70)
    
    protocol_stats = {}
    for proxy in PROXIES:
        try:
            _, _, _, scheme = parse_proxy_url(proxy)
            protocol_stats[scheme] = protocol_stats.get(scheme, 0) + 1
        except:
            pass
    
    print(f"\n代理协议分布:")
    for protocol, count in sorted(protocol_stats.items()):
        print(f"  {protocol.upper()}: {count} 个")
    print(f"\n开始测试 {len(PROXIES)} 个代理...\n")

    valid_proxies = []
    invalid_proxies = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(test_proxy, proxy): proxy for proxy in PROXIES}
        for future in as_completed(futures):
            proxy_url, is_valid, response_time, msg = future.result()
            if is_valid:
                valid_proxies.append((proxy_url, response_time, msg))
                print(f"[OK] {proxy_url:<50} - {response_time:.2f}s  {msg}")
            else:
                invalid_proxies.append((proxy_url, msg))
                error_short = str(msg)[:60] if msg else "Unknown error"
                print(f"[--] {proxy_url:<50} - {error_short}")

    print("\n" + "=" * 70)
    print(f"检测完成：{len(valid_proxies)} 可用 / {len(PROXIES)} 总计")
    print("=" * 70)
    
    if valid_proxies:
        valid_by_protocol = {}
        for proxy, t, msg in valid_proxies:
            try:
                _, _, _, scheme = parse_proxy_url(proxy)
                if scheme not in valid_by_protocol:
                    valid_by_protocol[scheme] = []
                valid_by_protocol[scheme].append((proxy, t, msg))
            except:
                pass
        
        print("\n可用代理列表 (按协议分类，响应时间排序):")
        for protocol in sorted(valid_by_protocol.keys()):
            print(f"\n  [{protocol.upper()}] 共 {len(valid_by_protocol[protocol])} 个:")
            for proxy, t, msg in sorted(valid_by_protocol[protocol], key=lambda x: x[1]):
                print(f"    {proxy:<50} {t:.2f}s  {msg}")

if __name__ == "__main__":
    main()
