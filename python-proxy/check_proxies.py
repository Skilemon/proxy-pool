#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
"""
SOCKS5 代理检测工具
验证代理能否实际请求: https://q.us-east-1.amazonaws.com/generateAssistantResponse
收到任意 HTTP 响应即视为可用
"""

import socket
import ssl
import socks
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

TARGET_HOST = "q.us-east-1.amazonaws.com"
TARGET_PORT = 443
TARGET_PATH = "/generateAssistantResponse"

import os as _os
_proxies_file = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "proxies.txt")
with open(_proxies_file, encoding="utf-8") as _f:
    PROXIES = [l.strip() for l in _f if l.strip() and not l.startswith("#")]

def test_proxy(proxy_url, timeout=10):
    proxy_url = proxy_url.strip()
    try:
        addr = proxy_url.replace("socks5://", "")
        host, port = addr.split(":")
        port = int(port)

        # 通过 SOCKS5 建立到目标的 TCP 连接
        sock = socks.socksocket()
        sock.set_proxy(socks.SOCKS5, host, port)
        sock.settimeout(timeout)
        start_time = time.time()
        sock.connect((TARGET_HOST, TARGET_PORT))

        # SSL 握手
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ssl_sock = ctx.wrap_socket(sock, server_hostname=TARGET_HOST)

        # 发送 HTTP POST 请求
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

        # 读取响应首行
        response = b""
        while b"\r\n" not in response:
            chunk = ssl_sock.recv(1024)
            if not chunk:
                break
            response += chunk
        ssl_sock.close()

        response_time = time.time() - start_time
        status_line = response.decode(errors='ignore').split('\r\n')[0]
        return (proxy_url, True, response_time, status_line)
    except Exception as e:
        return (proxy_url, False, None, str(e))

def main():
    print("=" * 70)
    print("SOCKS5 代理检测工具")
    print(f"验证目标: https://{TARGET_HOST}{TARGET_PATH}")
    print("=" * 70)
    print(f"\n开始测试 {len(PROXIES)} 个代理...\n")

    valid_proxies = []
    invalid_proxies = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(test_proxy, proxy): proxy for proxy in PROXIES}
        for future in as_completed(futures):
            proxy_url, is_valid, response_time, msg = future.result()
            if is_valid:
                valid_proxies.append((proxy_url, response_time, msg))
                print(f"[OK] {proxy_url:<45} - {response_time:.2f}s  {msg}")
            else:
                invalid_proxies.append((proxy_url, msg))
                error_short = str(msg)[:60] if msg else "Unknown error"
                print(f"[--] {proxy_url:<45} - {error_short}")

    print("\n" + "=" * 70)
    print(f"检测完成: {len(valid_proxies)} 可用 / {len(PROXIES)} 总计")
    print("=" * 70)
    if valid_proxies:
        print("\n可用代理列表 (按响应时间排序):")
        for proxy, t, msg in sorted(valid_proxies, key=lambda x: x[1]):
            print(f"  {proxy:<45} {t:.2f}s  {msg}")

if __name__ == "__main__":
    main()
