import { getDatabase } from '../database/connection';
import { ProxySource } from '../types';
import { generateId } from '../utils';

export class SourceService {
  async addSource(source: Omit<ProxySource, 'id' | 'createdAt'>): Promise<ProxySource> {
    const db = getDatabase();

    if (!source.url || !source.url.startsWith('http')) {
      throw new Error('无效的 URL');
    }

    const id = generateId();
    const createdAt = new Date().toISOString();

    await db.run(
      'INSERT INTO sources (id, name, url, enabled, createdAt) VALUES (?, ?, ?, ?, ?)',
      [id, source.name, source.url, source.enabled ? 1 : 0, createdAt]
    );

    return { ...source, id, createdAt };
  }

  async getAllSources(): Promise<ProxySource[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM sources ORDER BY createdAt DESC');
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled)
    }));
  }

  async getSourceById(id: string): Promise<ProxySource | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM sources WHERE id = ?', id);
    if (!row) return null;
    return { ...row, enabled: Boolean(row.enabled) };
  }

  async updateSource(id: string, updates: Partial<Omit<ProxySource, 'id' | 'createdAt'>>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.url !== undefined) {
      fields.push('url = ?');
      values.push(updates.url);
    }

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    if (updates.lastFetched !== undefined) {
      fields.push('lastFetched = ?');
      values.push(updates.lastFetched);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE sources SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async deleteSource(id: string): Promise<void> {
    const db = getDatabase();
    const row = await db.get('SELECT url FROM sources WHERE id = ?', id);
    if (row && row.url === 'https://charlespikachu.github.io/freeproxy/proxies.json') {
      throw new Error('默认来源不允许删除');
    }
    await db.run('DELETE FROM sources WHERE id = ?', id);
  }

  async getEnabledSources(): Promise<ProxySource[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM sources WHERE enabled = 1');
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled)
    }));
  }
}
