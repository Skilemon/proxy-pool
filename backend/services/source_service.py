from database import get_connection
from utils import generate_id
from datetime import datetime
from typing import List, Dict, Any, Optional


class SourceService:
    """代理源服务"""
    
    async def add_source(self, source: Dict[str, Any]) -> Dict[str, Any]:
        """添加代理源"""
        if not source['url'] or not source['url'].startswith('http'):
            raise ValueError('无效的 URL')
        
        with get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT id FROM sources WHERE url = ?', (source['url'],))
            if cursor.fetchone():
                raise ValueError('该 URL 已存在，请勿重复添加')
            
            source_id = generate_id()
            created_at = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO sources (id, name, url, enabled, isDefault, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (source_id, source['name'], source['url'],
                  1 if source.get('enabled', True) else 0, 0, created_at))
            
            return {
                **source,
                'id': source_id,
                'isDefault': False,
                'createdAt': created_at
            }
    
    async def get_all_sources(self) -> List[Dict[str, Any]]:
        """获取所有代理源"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM sources ORDER BY createdAt DESC')
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def get_source_by_id(self, source_id: str) -> Optional[Dict[str, Any]]:
        """根据 ID 获取代理源"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM sources WHERE id = ?', (source_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return dict(row)
    
    async def update_source(self, source_id: str, updates: Dict[str, Any]) -> None:
        """更新代理源"""
        fields = []
        values = []
        
        if 'name' in updates:
            fields.append('name = ?')
            values.append(updates['name'])
        
        if 'url' in updates:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT id FROM sources WHERE url = ? AND id != ?',
                             (updates['url'], source_id))
                if cursor.fetchone():
                    raise ValueError('该 URL 已存在，请勿重复添加')
            fields.append('url = ?')
            values.append(updates['url'])
        
        if 'enabled' in updates:
            fields.append('enabled = ?')
            values.append(1 if updates['enabled'] else 0)
        
        if 'lastFetched' in updates:
            fields.append('lastFetched = ?')
            values.append(updates['lastFetched'])
        
        if not fields:
            return
        
        values.append(source_id)
        
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f'UPDATE sources SET {", ".join(fields)} WHERE id = ?', values)
    
    async def delete_source(self, source_id: str) -> None:
        """删除代理源"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT isDefault FROM sources WHERE id = ?', (source_id,))
            row = cursor.fetchone()
            if row and row['isDefault']:
                raise ValueError('默认来源不允许删除')
            cursor.execute('DELETE FROM sources WHERE id = ?', (source_id,))
    
    async def get_enabled_sources(self) -> List[Dict[str, Any]]:
        """获取启用的代理源"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM sources WHERE enabled = 1')
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
