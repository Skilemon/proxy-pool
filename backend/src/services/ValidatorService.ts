import axios, { AxiosProxyConfig } from 'axios';
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

      await axios.get(this.testUrl, {
        proxy: proxyConfig,
        timeout: this.timeout,
        validateStatus: (status) => status === 204 || status === 200
      });

      const responseTime = Date.now() - startTime;

      return {
        proxyId: proxy.id,
        isValid: true,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        proxyId: proxy.id,
        isValid: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  async validateProxies(proxies: ProxyEntry[], concurrency: number = 10): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const queue = [...proxies];

    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const proxy = queue.shift();
        if (proxy) {
          const result = await this.validateProxy(proxy);
          results.push(result);
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
