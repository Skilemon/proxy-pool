import { getDatabase } from '../database/connection';
import { SocksAccount } from '../types';
import { generateId } from '../utils';

export class SocksAccountService {
  async getAll(): Promise<SocksAccount[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM socks_accounts ORDER BY createdAt DESC');
    return rows.map(r => ({ ...r, enabled: Boolean(r.enabled) }));
  }

  async getByUsername(username: string): Promise<SocksAccount | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM socks_accounts WHERE username = ? AND enabled = 1', username);
    if (!row) return null;
    return { ...row, enabled: Boolean(row.enabled) };
  }

  async create(username: string, password: string, mode: 'rotate' | 'sticky', maxDelay?: number, countryFilter?: string, countryFilterMode?: 'include' | 'exclude'): Promise<SocksAccount> {
    const db = getDatabase();
    const existing = await db.get('SELECT id FROM socks_accounts WHERE username = ?', username);
    if (existing) throw new Error('用户名已存在');

    const id = generateId();
    const createdAt = new Date().toISOString();
    await db.run(
      'INSERT INTO socks_accounts (id, username, password, mode, enabled, maxDelay, countryFilter, countryFilterMode, createdAt) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)',
      [id, username, password, mode, maxDelay ?? null, countryFilter ?? null, countryFilterMode ?? 'include', createdAt]
    );
    return { id, username, password, mode, enabled: true, maxDelay, countryFilter, countryFilterMode: countryFilterMode ?? 'include', createdAt };
  }

  async update(id: string, updates: Partial<Pick<SocksAccount, 'password' | 'mode' | 'enabled' | 'maxDelay' | 'countryFilter' | 'countryFilterMode'>>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.password !== undefined) { fields.push('password = ?'); values.push(updates.password); }
    if (updates.mode !== undefined) { fields.push('mode = ?'); values.push(updates.mode); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    if ('maxDelay' in updates) { fields.push('maxDelay = ?'); values.push(updates.maxDelay ?? null); }
    if ('countryFilter' in updates) { fields.push('countryFilter = ?'); values.push(updates.countryFilter ?? null); }
    if ('countryFilterMode' in updates) { fields.push('countryFilterMode = ?'); values.push(updates.countryFilterMode ?? 'include'); }
    if (fields.length === 0) return;
    values.push(id);
    await db.run(`UPDATE socks_accounts SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.run('DELETE FROM socks_accounts WHERE id = ?', id);
  }
}
