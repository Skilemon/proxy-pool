import re
import secrets
from typing import Optional, Dict, Any


def generate_id() -> str:
    """生成随机 ID"""
    return secrets.token_hex(16)


def parse_proxy_url(url: str) -> Optional[Dict[str, Any]]:
    """
    解析代理 URL
    支持格式：
    - http://host:port
    - https://host:port
    - socks4://host:port
    - socks5://host:port
    - http://user:pass@host:port
    """
    try:
        pattern = r'^(https?|socks[45])://(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$'
        match = re.match(pattern, url.strip())
        
        if not match:
            return None
        
        protocol = match.group(1)
        username = match.group(2)
        password = match.group(3)
        host = match.group(4)
        port = int(match.group(5))
        
        return {
            'protocol': protocol,
            'username': username,
            'password': password,
            'host': host,
            'port': port
        }
    except Exception:
        return None


def format_proxy_url(proxy: Dict[str, Any]) -> str:
    """格式化代理 URL"""
    auth = ''
    if proxy.get('username') and proxy.get('password'):
        auth = f"{proxy['username']}:{proxy['password']}@"
    return f"{proxy['protocol']}://{auth}{proxy['host']}:{proxy['port']}"


def is_valid_ip(ip: str) -> bool:
    """验证 IP 地址"""
    ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    
    if re.match(ipv4_pattern, ip):
        parts = ip.split('.')
        return all(0 <= int(part) <= 255 for part in parts)
    
    ipv6_pattern = r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
    return bool(re.match(ipv6_pattern, ip))


def is_valid_port(port: int) -> bool:
    """验证端口号"""
    return isinstance(port, int) and 0 < port <= 65535


def sleep(ms: int):
    """休眠指定毫秒"""
    import time
    time.sleep(ms / 1000.0)
