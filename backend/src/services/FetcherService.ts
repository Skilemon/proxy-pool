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

  private parseProxies(data: any): Array<{ protocol: 'http' | 'https' | 'socks4' | 'socks5'; host: string; port: number; username?: string; password?: string; isValid: boolean }> {
    const proxies: Array<any> = [];

    if (typeof data === 'string') {
      const lines = data.split('\n').map((line: string) => line.trim()).filter((line: string) => line);

      for (const line of lines) {
        const parsed = parseProxyUrl(line);
        if (parsed) {
          proxies.push({ ...parsed, isValid: false });
        }
      }
    } else if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'string') {
          const parsed = parseProxyUrl(item);
          if (parsed) {
            proxies.push({ ...parsed, isValid: false });
          }
        } else if (typeof item === 'object' && item.host && item.port) {
          proxies.push({
            protocol: item.protocol || 'http',
            host: item.host,
            port: item.port,
            username: item.username,
            password: item.password,
            isValid: false
          });
        }
      }
    }

    return proxies;
  }
}
