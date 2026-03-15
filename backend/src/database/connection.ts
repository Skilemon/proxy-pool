import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/proxypool.db');

// node:sqlite 兼容层：将同步 API 包装为与原 sqlite/sqlite3 相同的异步接口
class AsyncDatabase {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async get(sql: string, ...params: any[]): Promise<any> {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this.db.prepare(sql);
    return stmt.get(...args) ?? undefined;
  }

  async all(sql: string, ...params: any[]): Promise<any[]> {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this.db.prepare(sql);
    return stmt.all(...args) as any[];
  }

  async run(sql: string, ...params: any[]): Promise<void> {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this.db.prepare(sql);
    stmt.run(...args);
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

let db: AsyncDatabase | null = null;

export async function openDatabase(): Promise<AsyncDatabase> {
  if (db) return db;

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const nativeDb = new DatabaseSync(DB_PATH);
  db = new AsyncDatabase(nativeDb);

  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await openDatabase();

  await database.exec(`
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
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_proxies_valid ON proxies(isValid);
    CREATE INDEX IF NOT EXISTS idx_proxies_protocol ON proxies(protocol);
    CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
  `);

  // 迁移：为旧数据库的 sources 表添加 isDefault 字段
  try {
    await database.exec(`ALTER TABLE sources ADD COLUMN isDefault INTEGER DEFAULT 0`);
  } catch {
    // 字段已存在，忽略
  }

  // 迁移：为旧数据库的 socks_accounts 表添加 maxDelay 字段
  try {
    await database.exec(`ALTER TABLE socks_accounts ADD COLUMN maxDelay INTEGER`);
  } catch {
    // 字段已存在，忽略
  }

  await initDefaultSettings(database);
  await initDefaultSources(database);
}

const DEFAULT_SOURCES = [
  {
    name: '皮卡丘',
    url: 'https://charlespikachu.github.io/freeproxy/proxies.json'
  },
  {
    name: '站大爷',
    url: 'http://www.zdopen.com/FreeProxy/Get/'
  }
];

async function initDefaultSources(database: AsyncDatabase): Promise<void> {
  const count = await database.get('SELECT COUNT(*) as cnt FROM sources');
  if (count && count.cnt > 0) return;

  const { randomUUID } = await import('node:crypto');
  for (const source of DEFAULT_SOURCES) {
    await database.run(
      'INSERT INTO sources (id, name, url, enabled, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      randomUUID(),
      source.name,
      source.url,
      1,
      1,
      new Date().toISOString()
    );
  }
}

async function initDefaultSettings(database: AsyncDatabase): Promise<void> {
  const defaults = {
    validationInterval: '30',
    fetchInterval: '60',
    validationTimeout: '5000',
    validationConcurrency: '10',
    testUrl: 'http://www.apple.com/library/test/success.html',
    clearInvalidOnFetch: 'false'
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = await database.get('SELECT value FROM settings WHERE key = ?', key);
    if (!existing) {
      await database.run('INSERT INTO settings (key, value) VALUES (?, ?)', key, value);
    }
  }
}

export function getDatabase(): AsyncDatabase {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
