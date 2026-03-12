import axios, { AxiosProxyConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ProxyEntry, ValidationResult } from '../types';
import { formatProxyUrl } from '../utils';

export class ValidatorService {
  private testUrl: string;
  private timeout: number;

  constructor(testUrl: string = 'https://cp.cloudflare.com/generate_204', timeout: number = 5000) {
    this.testUrl = testUrl;
    this.timeout = timeout;
  }

  async validateProxy(proxy: ProxyEntry): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const isSocks = proxy.protocol === 'socks4' || proxy.protocol === 'socks5';
      let requestConfig: any = {
        timeout: this.timeout,
        validateStatus: (status: number) => status === 204 || status === 200
      };

      if (isSocks) {
        const auth = proxy.username && proxy.password
          ? `${proxy.username}:${proxy.password}@`
          : '';
        const proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
        const agent = new SocksProxyAgent(proxyUrl);
        requestConfig.httpAgent = agent;
        requestConfig.httpsAgent = agent;
        requestConfig.proxy = false;
      } else {
        const proxyConfig: AxiosProxyConfig = {
          protocol: proxy.protocol as any,
          host: proxy.host,
          port: proxy.port
        };
        if (proxy.username && proxy.password) {
          proxyConfig.auth = {
            username: proxy.username,
            password: proxy.password
          };
        }
        requestConfig.proxy = proxyConfig;
      }

      await axios.get(this.testUrl, requestConfig);

      const responseTime = Date.now() - startTime;

      console.log(`[验证] ✓ ${formatProxyUrl(proxy)} 有效 (${responseTime}ms)`);

      return {
        proxyId: proxy.id,
        isValid: true,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.log(`[验证] ✗ ${formatProxyUrl(proxy)} 无效`);

      return {
        proxyId: proxy.id,
        isValid: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  async validateProxies(proxies: ProxyEntry[], concurrency: number = 10, onResult?: (result: ValidationResult) => Promise<void>): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const queue = [...proxies];

    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const proxy = queue.shift();
        if (proxy) {
          const result = await this.validateProxy(proxy);
          results.push(result);
          if (onResult) await onResult(result);
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  setTestUrl(url: string): void {
    this.testUrl = url;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}
