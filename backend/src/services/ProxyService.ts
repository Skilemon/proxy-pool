import { getDatabase } from '../database/connection';
import { ProxyEntry, ImportResult, StatsData } from '../types';
import { generateId, parseProxyUrl, isValidIp, isValidPort } from '../utils';

export class ProxyService {
  async addProxy(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>): Promise<ProxyEntry> {
    const db = getDatabase();

    if (!isValidIp(proxy.host) && !/^[a-zA-Z0-9.-]+$/.test(proxy.host)) {
      throw new Error('无效的主机地址');
    }

    if (!isValidPort(proxy.port)) {
      throw new Error('无效的端口号');
    }

    const existing = await db.get(
      'SELECT id FROM proxies WHERE protocol = ? AND host = ? AND port = ?',
      proxy.protocol, proxy.host, proxy.port
    );

    if (existing) {
      throw new Error('代理已存在');
    }

    const id = generateId();
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO proxies (id, protocol, host, port, username, password, country, isValid, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, proxy.protocol, proxy.host, proxy.port, proxy.username || null, proxy.password || null, proxy.country || null, createdAt]
    );

    return { ...proxy, id, createdAt, isValid: false };
  }

  async addProxies(proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[]): Promise<ImportResult> {
    const added: ProxyEntry[] = [];
    let duplicates = 0;

    for (const proxy of proxies) {
      try {
        const result = await this.addProxy(proxy);
        added.push(result);
      } catch (error: any) {
        if (error.message.includes('已存在')) {
          duplicates++;
        }
      }
    }

    return { added, duplicates };
  }

  async getAllProxies(): Promise<ProxyEntry[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM proxies ORDER BY createdAt DESC');
    return rows.map(row => ({
      ...row,
      isValid: Boolean(row.isValid)
    }));
  }

  async getProxiesPaged(options: {
    page: number;
    pageSize: number;
    protocol?: string;
    status?: 'valid' | 'invalid' | 'all';
    maxResponseTime?: number;
    country?: string;
  }): Promise<{ data: ProxyEntry[]; total: number }> {
    const db = getDatabase();
    const { page, pageSize, protocol, status, maxResponseTime, country } = options;
    const conditions: string[] = [];
    const params: any[] = [];

    if (protocol && protocol !== 'all') {
      conditions.push('protocol = ?');
      params.push(protocol);
    }
    if (status === 'valid') {
      conditions.push('isValid = 1');
    } else if (status === 'invalid') {
      conditions.push('isValid = 0');
    }
    if (maxResponseTime) {
      conditions.push('responseTime IS NOT NULL AND responseTime <= ?');
      params.push(maxResponseTime);
    }
    if (country === 'unknown') {
      conditions.push('(country IS NULL OR country = \'\')' );
    } else if (country && country !== 'all') {
      conditions.push('country = ?');
      params.push(country);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRow = await db.get(`SELECT COUNT(*) as total FROM proxies ${where}`, params);
    const total = countRow?.total ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await db.all(
      `SELECT * FROM proxies ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      data: rows.map(row => ({ ...row, isValid: Boolean(row.isValid) })),
      total
    };
  }

  async getProxyById(id: string): Promise<ProxyEntry | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM proxies WHERE id = ?', id);
    if (!row) return null;
    return { ...row, isValid: Boolean(row.isValid) };
  }

  async getValidProxy(protocol?: string, maxResponseTime?: number): Promise<ProxyEntry | null> {
    const db = getDatabase();
    let query = 'SELECT * FROM proxies WHERE isValid = 1';
    const params: any[] = [];

    if (protocol) {
      query += ' AND protocol = ?';
      params.push(protocol);
    }

    if (maxResponseTime !== undefined) {
      query += ' AND responseTime <= ?';
      params.push(maxResponseTime);
    }

    query += ' ORDER BY RANDOM() LIMIT 1';

    const row = await db.get(query, params);
    if (!row) return null;
    return { ...row, isValid: Boolean(row.isValid) };
  }

  async getValidProxyCandidates(protocol?: string, maxResponseTime?: number, limit: number = 10, excludeIds: string[] = []): Promise<ProxyEntry[]> {
    const db = getDatabase();
    let query = 'SELECT * FROM proxies WHERE isValid = 1';
    const params: any[] = [];

    if (protocol) {
      query += ' AND protocol = ?';
      params.push(protocol);
    }

    if (maxResponseTime !== undefined) {
      query += ' AND responseTime <= ?';
      params.push(maxResponseTime);
    }

    if (excludeIds.length > 0) {
      query += ` AND id NOT IN (${excludeIds.map(() => '?').join(',')})`;
      params.push(...excludeIds);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(limit);

    const rows = await db.all(query, params);
    return rows.map(row => ({ ...row, isValid: Boolean(row.isValid) }));
  }

  async deleteInvalidProxies(): Promise<number> {
    const db = getDatabase();
    const result = await db.get('SELECT COUNT(*) as count FROM proxies WHERE isValid = 0');
    const count = result?.count ?? 0;
    await db.run('DELETE FROM proxies WHERE isValid = 0');
    return count;
  }

  async deleteProxy(id: string): Promise<void> {
    const db = getDatabase();
    await db.run('DELETE FROM proxies WHERE id = ?', id);
  }

  async deleteProxies(ids: string[]): Promise<void> {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM proxies WHERE id IN (${placeholders})`, ids);
  }

  async updateProxyValidation(id: string, isValid: boolean, responseTime?: number): Promise<void> {
    const db = getDatabase();
    const lastChecked = new Date().toISOString();

    await db.run(
      'UPDATE proxies SET isValid = ?, lastChecked = ?, responseTime = ? WHERE id = ?',
      [isValid ? 1 : 0, lastChecked, responseTime || null, id]
    );
  }

  async updateProxyCountry(id: string, country: string): Promise<void> {
    const db = getDatabase();
    await db.run('UPDATE proxies SET country = ? WHERE id = ?', [country, id]);
  }

  async getCountries(): Promise<string[]> {
    const db = getDatabase();
    const rows = await db.all(
      `SELECT DISTINCT country FROM proxies WHERE country IS NOT NULL AND country != '' ORDER BY country`
    );
    return rows.map(r => r.country as string);
  }

  async getStats(): Promise<StatsData> {
    const db = getDatabase();

    const total = await db.get('SELECT COUNT(*) as count FROM proxies');
    const valid = await db.get('SELECT COUNT(*) as count FROM proxies WHERE isValid = 1');
    const byProtocol = await db.all(
      'SELECT protocol, COUNT(*) as total, SUM(isValid) as valid FROM proxies GROUP BY protocol'
    );

    const byProtocolMap: Record<string, { total: number; valid: number; invalid: number }> = {};
    byProtocol.forEach(row => {
      const rowTotal = row.total as number;
      const rowValid = (row.valid as number) || 0;
      byProtocolMap[row.protocol] = {
        total: rowTotal,
        valid: rowValid,
        invalid: rowTotal - rowValid
      };
    });

    return {
      total: total.count,
      valid: valid.count,
      invalid: total.count - valid.count,
      byProtocol: byProtocolMap
    };
  }

  async importFromText(text: string): Promise<ImportResult> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[] = [];

    for (const line of lines) {
      const parsed = parseProxyUrl(line);
      if (parsed) {
        proxies.push({
          protocol: parsed.protocol as any,
          host: parsed.host,
          port: parsed.port,
          username: parsed.username,
          password: parsed.password,
          isValid: false
        });
      }
    }

    return this.addProxies(proxies);
  }

  async exportToText(ids?: string[]): Promise<string> {
    const db = getDatabase();
    let query = 'SELECT * FROM proxies';
    let params: any[] = [];

    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      query += ` WHERE id IN (${placeholders})`;
      params = ids;
    }

    const rows = await db.all(query, params);

    return rows.map(row => {
      const auth = row.username && row.password ? `${row.username}:${row.password}@` : '';
      return `${row.protocol}://${auth}${row.host}:${row.port}`;
    }).join('\n');
  }
}
