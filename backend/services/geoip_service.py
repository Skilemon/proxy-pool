import os
import ssl
import json
from typing import Optional
from database import get_connection

GEOIP_FILE = os.getenv('GEOIP_DB_PATH', 'data/GeoLite2-Country.mmdb')
GEOIP_URL = 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb'

_reader = None
_loading = False


async def lookup_country(ip: str) -> Optional[str]:
    """根据 IP 查询国家代码"""
    return lookup_country_sync(ip)

def lookup_country_sync(ip: str) -> Optional[str]:
    """根据 IP 查询国家代码（同步版本）"""
    global _reader, _loading
    
    try:
        import geoip2.database
        
        if not _reader and not _loading:
            _loading = True
            if not os.path.exists(GEOIP_FILE):
                return None
            
            if os.path.exists(GEOIP_FILE):
                try:
                    _reader = geoip2.database.Reader(GEOIP_FILE)
                    print(f'[GeoIP] GeoLite2-Country.mmdb 数据库已加载：{GEOIP_FILE}')
                except Exception as e:
                    print(f'[GeoIP] 加载数据库失败：{e}')
                    _loading = False
                    return None
        
        if _reader:
            try:
                response = _reader.country(ip)
                return response.country.iso_code
            except Exception:
                return None
        
        return None
    except ImportError:
        print('[GeoIP] geoip2 库未安装，国家查询不可用')
        return None


async def _download_database():
    """下载 GeoIP 数据库"""
    import urllib.request
    
    try:
        settings_service = None
        try:
            from services.settings_service import SettingsService
            settings_service = SettingsService()
        except:
            pass
        
        download_url = GEOIP_URL
        if settings_service:
            try:
                proxy_url = await settings_service.get_setting('geoipProxyUrl')
                if proxy_url and proxy_url.strip():
                    base = proxy_url.strip().rstrip('/')
                    download_url = f'{base}/{GEOIP_URL}'
            except:
                pass
        
        print(f'[GeoIP] 正在下载 GeoLite2-Country.mmdb...')
        print(f'[GeoIP] 下载地址：{download_url}')
        
        db_dir = os.path.dirname(GEOIP_FILE)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        
        tmp_file = GEOIP_FILE + '.tmp'
        
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(download_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60, context=context) as response:
            with open(tmp_file, 'wb') as out_file:
                out_file.write(response.read())
        
        os.rename(tmp_file, GEOIP_FILE)
        print(f'[GeoIP] GeoLite2-Country.mmdb 下载完成：{GEOIP_FILE}')
        
    except Exception as e:
        print(f'[GeoIP] 下载数据库失败：{e}')
    finally:
        global _loading
        _loading = False
