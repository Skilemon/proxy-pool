import path from 'path';
import fs from 'fs';
import https from 'https';
import { SettingsService } from './SettingsService';

const DB_FILE = process.env.GEOIP_DB_PATH || path.join(__dirname, '../../data/GeoLite2-Country.mmdb');
const DB_DOWNLOAD_URL = 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let reader: any = null;
let loadAttempted = false;

async function getDownloadUrl(): Promise<string> {
  try {
    const settingsService = new SettingsService();
    const proxyUrl = await settingsService.getSetting('geoipProxyUrl');
    if (proxyUrl && proxyUrl.trim()) {
      const base = proxyUrl.trim().replace(/\/$/, '');
      return `${base}/${DB_DOWNLOAD_URL}`;
    }
  } catch {
    // 读取配置失败时直连下载
  }
  return DB_DOWNLOAD_URL;
}

function downloadDatabase(downloadUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[GeoIP] 正在下载 GeoLite2-Country.mmdb...');
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = DB_FILE + '.tmp';
    const file = fs.createWriteStream(tmpFile);

    const request = (url: string) => {
      https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          request(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(tmpFile, () => {});
          reject(new Error(`下载失败，HTTP 状态码: ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          fs.rename(tmpFile, DB_FILE, (err) => {
            if (err) reject(err);
            else {
              console.log('[GeoIP] GeoLite2-Country.mmdb 下载完成:', DB_FILE);
              resolve();
            }
          });
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(tmpFile, () => {});
        reject(err);
      });
    };

    request(downloadUrl);
  });
}

async function getReader(): Promise<any> {
  if (loadAttempted) return reader;
  loadAttempted = true;

  if (!fs.existsSync(DB_FILE)) {
    try {
      const downloadUrl = await getDownloadUrl();
      console.log('[GeoIP] 下载地址:', downloadUrl);
      await downloadDatabase(downloadUrl);
    } catch (err) {
      console.error('[GeoIP] 自动下载数据库失败，国家查询不可用:', err);
      return null;
    }
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
