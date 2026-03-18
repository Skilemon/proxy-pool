from database import get_connection
from utils import generate_id
from datetime import datetime
from typing import List, Dict, Any, Optional


class SocksAccountService:
    """SOCKS 账号服务"""
    
    async def get_all(self) -> List[Dict[str, Any]]:
        """获取所有账号"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM socks_accounts ORDER BY createdAt DESC')
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """根据用户名获取账号"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT * FROM socks_accounts WHERE username = ? AND enabled = 1',
                (username,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return dict(row)
    
    async def create(self, username: str, password: str, mode: str = 'rotate',
                    max_delay: Optional[int] = None, country_filter: Optional[str] = None,
                    country_filter_mode: str = 'include') -> Dict[str, Any]:
        """创建账号"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM socks_accounts WHERE username = ?', (username,))
            if cursor.fetchone():
                raise ValueError('用户名已存在')
            
            account_id = generate_id()
            created_at = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO socks_accounts (id, username, password, mode, enabled, maxDelay,
                                           countryFilter, countryFilterMode, createdAt)
                VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
            ''', (account_id, username, password, mode, max_delay, country_filter,
                  country_filter_mode, created_at))
            
            return {
                'id': account_id,
                'username': username,
                'password': password,
                'mode': mode,
                'enabled': True,
                'maxDelay': max_delay,
                'countryFilter': country_filter,
                'countryFilterMode': country_filter_mode,
                'createdAt': created_at
            }
    
    async def update(self, account_id: str, updates: Dict[str, Any]) -> None:
        """更新账号"""
        fields = []
        values = []
        
        if 'password' in updates:
            fields.append('password = ?')
            values.append(updates['password'])
        
        if 'mode' in updates:
            if updates['mode'] not in ['rotate', 'sticky']:
                raise ValueError('模式无效')
            fields.append('mode = ?')
            values.append(updates['mode'])
        
        if 'enabled' in updates:
            fields.append('enabled = ?')
            values.append(1 if updates['enabled'] else 0)
        
        if 'maxDelay' in updates:
            fields.append('maxDelay = ?')
            values.append(updates['maxDelay'] if updates['maxDelay'] is not None else None)
        
        if 'countryFilter' in updates:
            fields.append('countryFilter = ?')
            values.append(updates['countryFilter'] if updates['countryFilter'] else None)
        
        if 'countryFilterMode' in updates:
            mode = updates['countryFilterMode'] if updates['countryFilterMode'] in ['include', 'exclude'] else 'include'
            fields.append('countryFilterMode = ?')
            values.append(mode)
        
        if not fields:
            return
        
        values.append(account_id)
        
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f'UPDATE socks_accounts SET {", ".join(fields)} WHERE id = ?', values)
    
    async def delete(self, account_id: str) -> None:
        """删除账号"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM socks_accounts WHERE id = ?', (account_id,))
