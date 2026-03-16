import path from 'path';
import fs from 'fs';

const DB_FILE = process.env.GEOIP_DB_PATH || path.join(__dirname, '../../data/GeoLite2-Country.mmdb');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let reader: any = null;
let loadAttempted = false;

async function getReader(): Promise<any> {
  if (loadAttempted) return reader;
  loadAttempted = true;

  if (!fs.existsSync(DB_FILE)) {
    console.warn('[GeoIP] GeoLite2-Country.mmdb 未找到，国家查询不可用。请将数据库文件放置于:', DB_FILE);
    return null;
  }

  try {
    const { Reader } = await import('@maxmind/geoip2-node');
    reader = await Reader.open(DB_FILE);
    console.log('[GeoIP] GeoLite2 数据库已加载:', DB_FILE);
  } catch (err) {
    console.error('[GeoIP] 加载数据库失败:', err);
  }
  return reader;
}

/**
 * 根据 IP 地址查询 ISO 3166-1 alpha-2 国家代码（如 'CN'、'US'）。
 * 若数据库未加载或 IP 无记录，返回 null。
 */
export async function lookupCountry(ip: string): Promise<string | null> {
  const r = await getReader();
  if (!r) return null;
  try {
    const response = r.country(ip);
    return response.country?.isoCode ?? null;
  } catch {
    // 私有 IP、域名等无记录时静默忽略
    return null;
  }
}
