import axios from 'axios';
import { ProxyService } from './ProxyService';
import { SourceService } from './SourceService';
import { parseProxyUrl } from '../utils';

export class FetcherService {
  private proxyService: ProxyService;
  private sourceService: SourceService;

  constructor(proxyService: ProxyService, sourceService: SourceService) {
    this.proxyService = proxyService;
    this.sourceService = sourceService;
  }

  async fetchFromSource(sourceId: string): Promise<{ added: number; duplicates: number }> {
    const source = await this.sourceService.getSourceById(sourceId);
    if (!source || !source.enabled) {
      throw new Error('来源不存在或已禁用');
    }

    try {
      const response = await axios.get(source.url, { timeout: 30000 });
      const proxies = this.parseProxies(response.data);

      const result = await this.proxyService.addProxies(proxies);

      await this.sourceService.updateSource(sourceId, {
        lastFetched: new Date().toISOString()
      });

      return {
        added: result.added.length,
        duplicates: result.duplicates
      };
    } catch (error: any) {
      throw new Error(`获取失败: ${error.message}`);
    }
  }

  async fetchFromAllSources(): Promise<{ total: number; added: number; duplicates: number }> {
    const sources = await this.sourceService.getEnabledSources();
    let totalAdded = 0;
    let totalDuplicates = 0;

    for (const source of sources) {
      try {
        const result = await this.fetchFromSource(source.id);
        totalAdded += result.added;
        totalDuplicates += result.duplicates;
      } catch (error) {
        console.error(`从来源 ${source.name} 获取失败:`, error);
      }
    }

    return {
      total: sources.length,
      added: totalAdded,
      duplicates: totalDuplicates
    };
  }

  private parseProxies(data: any): Array<{ protocol: 'http' | 'https' | 'socks4' | 'socks5'; host: string; port: number; username?: string; password?: string; country?: string; isValid: boolean }> {
    const proxies: Array<any> = [];

    // 支持 { data: { proxy_list: [...] } } 包装格式（如站大爷源）
    if (typeof data === 'object' && data !== null &&
        typeof data.data === 'object' && data.data !== null &&
        Array.isArray(data.data.proxy_list)) {
      return this.parseProxies(data.data.proxy_list);
    }

    // 支持 { data: [...] } 包装格式（如皮卡丘源）
    const list = (typeof data === 'object' && data !== null && Array.isArray(data.data))
      ? data.data
      : data;

    if (typeof list === 'string') {
      const lines = list.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
      for (const line of lines) {
        const parsed = parseProxyUrl(line);
        if (parsed) {
          proxies.push({ ...parsed, isValid: false });
        }
      }
    } else if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === 'string') {
          const parsed = parseProxyUrl(item);
          if (parsed) {
            proxies.push({ ...parsed, isValid: false });
          }
        } else if (typeof item === 'object' && item !== null) {
          // 兼容 host/ip 字段，protocol 兼容大小写
          const host = item.host || item.ip;
          const port = item.port;
          if (!host || !port) continue;
          const rawProtocol = (item.protocol || 'http').toString().toLowerCase();
          const protocol = (['http', 'https', 'socks4', 'socks5'].includes(rawProtocol)
            ? rawProtocol
            : 'http') as 'http' | 'https' | 'socks4' | 'socks5';
          proxies.push({
            protocol,
            host,
            port: Number(port),
            username: item.username,
            password: item.password,
            country: item.country,
            isValid: false
          });
        }
      }
    }

    return proxies;
  }
}
