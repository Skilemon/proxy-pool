from database import get_connection
from typing import Dict, Any, Optional


class SettingsService:
    """设置服务"""
    
    def get_default_settings(self) -> Dict[str, Any]:
        """获取默认设置"""
        return {
            'validationInterval': 30,
            'fetchInterval': 60,
            'validationTimeout': 5000,
            'validationConcurrency': 10,
            'testUrl': 'http://www.apple.com/library/test/success.html',
            'clearInvalidOnFetch': False,
            'geoipProxyUrl': ''
        }
    
    async def get_settings(self) -> Dict[str, Any]:
        """获取当前设置"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT key, value FROM settings')
            rows = cursor.fetchall()
            
            settings = {row['key']: row['value'] for row in rows}
            
            return {
                'validationInterval': int(settings.get('validationInterval', '30')),
                'fetchInterval': int(settings.get('fetchInterval', '60')),
                'validationTimeout': int(settings.get('validationTimeout', '5000')),
                'validationConcurrency': int(settings.get('validationConcurrency', '10')),
                'testUrl': settings.get('testUrl', 'http://www.apple.com/library/test/success.html'),
                'clearInvalidOnFetch': settings.get('clearInvalidOnFetch', 'false') == 'true',
                'geoipProxyUrl': settings.get('geoipProxyUrl', '')
            }
    
    async def update_settings(self, updates: Dict[str, Any]) -> None:
        """更新设置"""
        with get_connection() as conn:
            cursor = conn.cursor()
            for key, value in updates.items():
                cursor.execute(
                    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    (key, str(value))
                )
    
    async def get_setting(self, key: str) -> Optional[str]:
        """获取单个设置"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
            row = cursor.fetchone()
            return row['value'] if row else None
    
    async def set_setting(self, key: str, value: str) -> None:
        """设置单个值"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                (key, value)
            )
