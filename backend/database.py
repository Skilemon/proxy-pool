import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager
import hashlib

DB_PATH = os.getenv('DB_PATH', 'data/proxypool.db')

_db = None

def get_database():
    """获取数据库连接"""
    global _db
    if _db is None:
        raise RuntimeError('Database not initialized')
    return _db

@contextmanager
def get_connection():
    """获取数据库连接的上下文管理器"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_database():
    """初始化数据库"""
    global _db
    
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.executescript('''
            CREATE TABLE IF NOT EXISTS proxies (
                id TEXT PRIMARY KEY,
                protocol TEXT NOT NULL,
                host TEXT NOT NULL,
                port INTEGER NOT NULL,
                username TEXT,
                password TEXT,
                country TEXT,
                isValid INTEGER DEFAULT 0,
                lastChecked TEXT,
                responseTime INTEGER,
                createdAt TEXT NOT NULL,
                UNIQUE(protocol, host, port)
            );
            
            CREATE TABLE IF NOT EXISTS sources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                isDefault INTEGER DEFAULT 0,
                lastFetched TEXT,
                createdAt TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS socks_accounts (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'rotate',
                enabled INTEGER DEFAULT 1,
                maxDelay INTEGER,
                countryFilter TEXT,
                countryFilterMode TEXT DEFAULT 'include',
                createdAt TEXT NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_proxies_valid ON proxies(isValid);
            CREATE INDEX IF NOT EXISTS idx_proxies_protocol ON proxies(protocol);
            CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
        ''')
        
        _init_default_settings(cursor)
        _init_default_sources(cursor)
    
    _db = True
    print('数据库初始化完成')

def _init_default_settings(cursor):
    """初始化默认设置"""
    defaults = {
        'validationInterval': '30',
        'fetchInterval': '60',
        'validationTimeout': '5000',
        'validationConcurrency': '10',
        'testUrl': 'http://www.apple.com/library/test/success.html',
        'clearInvalidOnFetch': 'false',
        'geoipProxyUrl': ''
    }
    
    for key, value in defaults.items():
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        if not cursor.fetchone():
            cursor.execute('INSERT INTO settings (key, value) VALUES (?, ?)', (key, value))

def _init_default_sources(cursor):
    """初始化默认代理源"""
    cursor.execute('SELECT COUNT(*) as cnt FROM sources')
    if cursor.fetchone()['cnt'] > 0:
        return
    
    default_sources = [
        {'name': '皮卡丘', 'url': 'https://charlespikachu.github.io/freeproxy/proxies.json'},
        {'name': '站大爷', 'url': 'http://www.zdopen.com/FreeProxy/Get/'}
    ]
    
    for source in default_sources:
        source_id = hashlib.md5(f"{source['name']}{datetime.now().isoformat()}".encode()).hexdigest()[:32]
        cursor.execute('''
            INSERT INTO sources (id, name, url, enabled, isDefault, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (source_id, source['name'], source['url'], 1, 1, datetime.now().isoformat()))

def close_database():
    """关闭数据库连接"""
    global _db
    _db = None
