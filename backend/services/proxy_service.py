from database import get_connection
from utils import generate_id, parse_proxy_url, is_valid_ip, is_valid_port
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple


class ProxyService:
    """代理服务"""
    
    async def add_proxy(self, proxy: Dict[str, Any]) -> Dict[str, Any]:
        """添加单个代理"""
        if not is_valid_ip(proxy['host']) and not re.match(r'^[a-zA-Z0-9.-]+$', proxy['host']):
            raise ValueError('无效的主机地址')
        
        if not is_valid_port(proxy['port']):
            raise ValueError('无效的端口号')
        
        with get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT id FROM proxies WHERE protocol = ? AND host = ? AND port = ?',
                (proxy['protocol'], proxy['host'], proxy['port'])
            )
            
            if cursor.fetchone():
                raise ValueError('代理已存在')
            
            proxy_id = generate_id()
            created_at = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO proxies (id, protocol, host, port, username, password, country, isValid, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            ''', (proxy_id, proxy['protocol'], proxy['host'], proxy['port'],
                  proxy.get('username'), proxy.get('password'), proxy.get('country'), created_at))
            
            return {
                **proxy,
                'id': proxy_id,
                'createdAt': created_at,
                'isValid': False
            }
    
    async def add_proxies(self, proxies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """批量添加代理"""
        added = []
        duplicates = 0
        
        for proxy in proxies:
            try:
                result = await self.add_proxy(proxy)
                added.append(result)
            except ValueError as e:
                if '已存在' in str(e):
                    duplicates += 1
        
        return {'added': added, 'duplicates': duplicates}
    
    async def get_all_proxies(self) -> List[Dict[str, Any]]:
        """获取所有代理"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM proxies ORDER BY createdAt DESC')
            rows = cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    async def get_proxies_paged(self, page: int, page_size: int, protocol: str = 'all',
                                status: str = 'all', max_response_time: Optional[int] = None,
                                country: str = 'all') -> Dict[str, Any]:
        """分页获取代理"""
        conditions = []
        params = []
        
        if protocol and protocol != 'all':
            conditions.append('protocol = ?')
            params.append(protocol)
        
        if status == 'valid':
            conditions.append('isValid = 1')
        elif status == 'invalid':
            conditions.append('isValid = 0')
        
        if max_response_time:
            conditions.append('responseTime IS NOT NULL AND responseTime <= ?')
            params.append(max_response_time)
        
        if country == 'ZZ':
            conditions.append('(country IS NULL OR country = \'\' OR country = \'ZZ\')')
        elif country and country != 'all':
            conditions.append('country = ?')
            params.append(country)
        
        where = ' AND '.join(conditions) if conditions else '1=1'
        
        with get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(f'SELECT COUNT(*) as total FROM proxies WHERE {where}', params)
            total = cursor.fetchone()['total']
            
            offset = (page - 1) * page_size
            cursor.execute(
                f'SELECT * FROM proxies WHERE {where} ORDER BY createdAt DESC LIMIT ? OFFSET ?',
                params + [page_size, offset]
            )
            rows = cursor.fetchall()
            
            return {
                'data': [dict(row) for row in rows],
                'total': total
            }
    
    async def get_valid_proxy(self, protocol: Optional[str] = None, max_response_time: Optional[int] = None,
                             count: int = 1, country: Optional[str] = None,
                             country_mode: str = 'include') -> List[Dict[str, Any]]:
        """获取有效代理"""
        query = 'SELECT * FROM proxies WHERE isValid = 1'
        params = []
        
        if protocol:
            query += ' AND protocol = ?'
            params.append(protocol)
        
        if max_response_time is not None:
            query += ' AND responseTime <= ?'
            params.append(max_response_time)
        
        if country:
            if country_mode == 'exclude':
                query += ' AND (country IS NULL OR country != ?)'
            else:
                query += ' AND country = ?'
            params.append(country)
        
        query += ' ORDER BY RANDOM() LIMIT ?'
        params.append(count)
        
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def get_valid_proxy_candidates(self, protocol: Optional[str] = None,
                                        max_response_time: Optional[int] = None,
                                        limit: int = 10, exclude_ids: List[str] = None,
                                        country_filter: Optional[str] = None,
                                        country_filter_mode: str = 'include') -> List[Dict[str, Any]]:
        """获取有效代理候选"""
        query = 'SELECT * FROM proxies WHERE isValid = 1'
        params = []
        
        if protocol:
            query += ' AND protocol = ?'
            params.append(protocol)
        
        if max_response_time is not None:
            query += ' AND responseTime <= ?'
            params.append(max_response_time)
        
        if country_filter:
            codes = [c.strip().upper() for c in country_filter.split(',') if c.strip()]
            if codes:
                placeholders = ','.join(['?' for _ in codes])
                if country_filter_mode == 'exclude':
                    query += f' AND (country IS NULL OR UPPER(country) NOT IN ({placeholders}))'
                else:
                    query += f' AND UPPER(country) IN ({placeholders})'
                params.extend(codes)
        
        if exclude_ids:
            placeholders = ','.join(['?' for _ in exclude_ids])
            query += f' AND id NOT IN ({placeholders})'
            params.extend(exclude_ids)
        
        query += ' ORDER BY RANDOM() LIMIT ?'
        params.append(limit)
        
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def delete_invalid_proxies(self) -> int:
        """删除无效代理"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) as count FROM proxies WHERE isValid = 0')
            count = cursor.fetchone()['count']
            cursor.execute('DELETE FROM proxies WHERE isValid = 0')
            return count
    
    async def delete_proxy(self, proxy_id: str) -> None:
        """删除单个代理"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM proxies WHERE id = ?', (proxy_id,))
    
    async def delete_proxies(self, ids: List[str]) -> None:
        """批量删除代理"""
        with get_connection() as conn:
            cursor = conn.cursor()
            placeholders = ','.join(['?' for _ in ids])
            cursor.execute(f'DELETE FROM proxies WHERE id IN ({placeholders})', ids)
    
    async def update_proxy_validation(self, proxy_id: str, is_valid: bool,
                                     response_time: Optional[int] = None) -> None:
        """更新代理验证状态"""
        last_checked = datetime.now().isoformat()
        
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE proxies SET isValid = ?, lastChecked = ?, responseTime = ? WHERE id = ?
            ''', (1 if is_valid else 0, last_checked, response_time, proxy_id))
    
    async def update_proxy_country(self, proxy_id: str, country: str) -> None:
        """更新代理国家信息"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE proxies SET country = ? WHERE id = ?', (country, proxy_id))
    
    async def get_countries(self) -> List[str]:
        """获取所有国家代码"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT country FROM proxies
                WHERE country IS NOT NULL AND country != '' ORDER BY country
            ''')
            return [row['country'] for row in cursor.fetchall()]
    
    async def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        with get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) as count FROM proxies')
            total = cursor.fetchone()['count']
            
            cursor.execute('SELECT COUNT(*) as count FROM proxies WHERE isValid = 1')
            valid = cursor.fetchone()['count']
            
            cursor.execute('''
                SELECT protocol, COUNT(*) as total, SUM(isValid) as valid
                FROM proxies GROUP BY protocol
            ''')
            by_protocol_rows = cursor.fetchall()
            
            by_protocol = {}
            for row in by_protocol_rows:
                row_valid = row['valid'] or 0
                by_protocol[row['protocol']] = {
                    'total': row['total'],
                    'valid': row_valid,
                    'invalid': row['total'] - row_valid
                }
            
            return {
                'total': total,
                'valid': valid,
                'invalid': total - valid,
                'byProtocol': by_protocol
            }
    
    async def import_from_text(self, text: str) -> Dict[str, Any]:
        """从文本导入代理"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        proxies = []
        
        for line in lines:
            parsed = parse_proxy_url(line)
            if parsed:
                proxies.append({
                    'protocol': parsed['protocol'],
                    'host': parsed['host'],
                    'port': parsed['port'],
                    'username': parsed.get('username'),
                    'password': parsed.get('password'),
                    'isValid': False
                })
        
        return await self.add_proxies(proxies)
    
    async def export_to_text(self, ids: Optional[List[str]] = None) -> str:
        """导出代理为文本"""
        with get_connection() as conn:
            cursor = conn.cursor()
            
            if ids:
                placeholders = ','.join(['?' for _ in ids])
                cursor.execute(f'SELECT * FROM proxies WHERE id IN ({placeholders})', ids)
            else:
                cursor.execute('SELECT * FROM proxies')
            
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                auth = ''
                if row['username'] and row['password']:
                    auth = f"{row['username']}:{row['password']}@"
                result.append(f"{row['protocol']}://{auth}{row['host']}:{row['port']}")
            
            return '\n'.join(result)

import re
