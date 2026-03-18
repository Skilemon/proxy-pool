from database import get_connection
from utils import generate_id
from datetime import datetime
from typing import List, Dict, Any, Optional


class FetcherService:
    """代理获取服务"""
    
    def __init__(self, proxy_service, source_service):
        self.proxy_service = proxy_service
        self.source_service = source_service
    
    async def fetch_from_source(self, source_id: str) -> Dict[str, int]:
        """从指定源获取代理"""
        source = await self.source_service.get_source_by_id(source_id)
        if not source or not source['enabled']:
            raise ValueError('来源不存在或已禁用')
        
        import requests
        
        try:
            response = requests.get(source['url'], timeout=30)
            proxies = self._parse_proxies(response.json())
            
            result = await self.proxy_service.add_proxies(proxies)
            
            await self.source_service.update_source(source_id, {
                'lastFetched': datetime.now().isoformat()
            })
            
            return {
                'added': len(result['added']),
                'duplicates': result['duplicates']
            }
        except Exception as e:
            raise ValueError(f'获取失败：{str(e)}')
    
    async def fetch_from_all_sources(self) -> Dict[str, int]:
        """从所有源获取代理"""
        sources = await self.source_service.get_enabled_sources()
        total_added = 0
        total_duplicates = 0
        
        for source in sources:
            try:
                result = await self.fetch_from_source(source['id'])
                total_added += result['added']
                total_duplicates += result['duplicates']
            except Exception as e:
                print(f'从某个来源获取失败：{e}')
        
        return {
            'total': len(sources),
            'added': total_added,
            'duplicates': total_duplicates
        }
    
    def _parse_proxies(self, data: Any) -> List[Dict[str, Any]]:
        """解析代理数据"""
        proxies = []
        
        if isinstance(data, dict) and 'data' in data:
            if isinstance(data['data'], dict) and 'proxy_list' in data['data']:
                return self._parse_proxies(data['data']['proxy_list'])
            elif isinstance(data['data'], list):
                data = data['data']
        
        if isinstance(data, str):
            lines = [line.strip() for line in data.split('\n') if line.strip()]
            from utils import parse_proxy_url
            for line in lines:
                parsed = parse_proxy_url(line)
                if parsed:
                    proxies.append({**parsed, 'isValid': False})
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, str):
                    from utils import parse_proxy_url
                    parsed = parse_proxy_url(item)
                    if parsed:
                        proxies.append({**parsed, 'isValid': False})
                elif isinstance(item, dict):
                    host = item.get('host') or item.get('ip')
                    port = item.get('port')
                    if not host or not port:
                        continue
                    
                    protocol = str(item.get('protocol', 'http')).lower()
                    if protocol not in ['http', 'https', 'socks4', 'socks5']:
                        protocol = 'http'
                    
                    proxies.append({
                        'protocol': protocol,
                        'host': host,
                        'port': int(port),
                        'username': item.get('username'),
                        'password': item.get('password'),
                        'country': item.get('country'),
                        'isValid': False
                    })
        
        return proxies
