import requests
import time
from typing import List, Dict, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from utils import format_proxy_url


class ValidatorService:
    """代理验证服务"""
    
    def __init__(self, test_url: str = 'http://www.apple.com/library/test/success.html',
                 timeout: int = 5000):
        self.test_url = test_url
        self.timeout = timeout
    
    def validate_proxy(self, proxy: Dict[str, Any]) -> Dict[str, Any]:
        """验证单个代理"""
        start_time = time.time() * 1000
        
        try:
            is_socks = proxy['protocol'] in ['socks4', 'socks5']
            
            if is_socks:
                auth = ''
                if proxy.get('username') and proxy.get('password'):
                    auth = f"{proxy['username']}:{proxy['password']}@"
                proxy_url = f"{proxy['protocol']}://{auth}{proxy['host']}:{proxy['port']}"
                proxies = {
                    'http': proxy_url,
                    'https': proxy_url
                }
            else:
                proxy_url = format_proxy_url(proxy)
                proxies = {
                    'http': proxy_url,
                    'https': proxy_url
                }
            
            response = requests.get(
                self.test_url,
                proxies=proxies,
                timeout=self.timeout / 1000.0
            )
            
            if response.status_code in [200, 204]:
                response_time = int(time.time() * 1000 - start_time)
                print(f'[验证] ✓ {format_proxy_url(proxy)} 有效 ({response_time}ms)')
                
                return {
                    'proxyId': proxy['id'],
                    'isValid': True,
                    'responseTime': response_time,
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
                }
            else:
                print(f'[验证] ✗ {format_proxy_url(proxy)} 无效')
                return {
                    'proxyId': proxy['id'],
                    'isValid': False,
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
                }
                
        except Exception as e:
            print(f'[验证] ✗ {format_proxy_url(proxy)} 无效')
            return {
                'proxyId': proxy['id'],
                'isValid': False,
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
            }
    
    def validate_proxies(self, proxies: List[Dict[str, Any]], concurrency: int = 10,
                        on_result: Optional[Callable] = None) -> List[Dict[str, Any]]:
        """批量验证代理"""
        results = []
        
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = {executor.submit(self.validate_proxy, proxy): proxy for proxy in proxies}
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                    if on_result:
                        on_result(result)
                except Exception as e:
                    print(f'验证失败：{e}')
        
        return results
    
    def set_test_url(self, url: str):
        """设置测试 URL"""
        self.test_url = url
    
    def set_timeout(self, timeout: int):
        """设置超时时间（毫秒）"""
        self.timeout = timeout
