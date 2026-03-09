import { ProxyEntry, ProxyFilter, ImportResult, ValidationResult } from '../../shared/types';
import { generateId } from '../../shared/utils';
import { Storage } from '../storage';
import { ProxyValidator } from '../validators';
import { ImportExport } from '../utils';

export class ProxyManager {
  private storage: Storage;
  private proxies: Map<string, ProxyEntry>;
  private proxyKeys: Set<string>; // 用于快速检测重复 (protocol+host+port)

  constructor(storage: Storage) {
    this.storage = storage;
    this.proxies = new Map();
    this.proxyKeys = new Set();
  }

  /**
   * 生成代理唯一键
   */
  private getProxyKey(protocol: string, host: string, port: number): string {
    return `${protocol}://${host}:${port}`;
  }

  /**
   * 初始化 - 从存储加载代理
   */
  async initialize(): Promise<void> {
    const savedProxies = await this.storage.getProxies();
    this.proxies.clear();
    this.proxyKeys.clear();
    savedProxies.forEach(proxy => {
      this.proxies.set(proxy.id, proxy);
      this.proxyKeys.add(this.getProxyKey(proxy.protocol, proxy.host, proxy.port));
    });
  }

  /**
   * 检查代理是否重复
   */
  isDuplicate(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>): boolean {
    const key = this.getProxyKey(proxy.protocol, proxy.host, proxy.port);
    return this.proxyKeys.has(key);
  }

  /**
   * 添加单个代理
   */
  async addProxy(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>): Promise<ProxyEntry> {
    // 输入验证
    ProxyValidator.validateAndThrow(proxy);

    // 检查重复
    if (this.isDuplicate(proxy)) {
      throw new Error('代理已存在：该代理的协议、IP和端口组合已经存在');
    }

    const newProxy: ProxyEntry = {
      ...proxy,
      id: generateId(),
      createdAt: new Date(),
      isValid: false, // 默认未验证
    };

    this.proxies.set(newProxy.id, newProxy);
    this.proxyKeys.add(this.getProxyKey(newProxy.protocol, newProxy.host, newProxy.port));
    await this.storage.saveProxy(newProxy);
    
    return newProxy;
  }

  /**
   * 批量添加代理
   */
  async addProxies(proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[]): Promise<ImportResult> {
    const added: ProxyEntry[] = [];
    let duplicates = 0;

    for (const proxy of proxies) {
      // 输入验证 - 跳过无效的代理
      if (!ProxyValidator.isValid(proxy)) {
        continue;
      }

      // 检查重复
      if (this.isDuplicate(proxy)) {
        duplicates++;
        continue;
      }

      const newProxy: ProxyEntry = {
        ...proxy,
        id: generateId(),
        createdAt: new Date(),
        isValid: false,
      };

      this.proxies.set(newProxy.id, newProxy);
      this.proxyKeys.add(this.getProxyKey(newProxy.protocol, newProxy.host, newProxy.port));
      added.push(newProxy);
    }

    if (added.length > 0) {
      await this.storage.saveProxies(added);
    }

    return { added, duplicates };
  }

  /**
   * 删除单个代理
   */
  async deleteProxy(id: string): Promise<void> {
    const proxy = this.proxies.get(id);
    if (proxy) {
      this.proxyKeys.delete(this.getProxyKey(proxy.protocol, proxy.host, proxy.port));
    }
    this.proxies.delete(id);
    await this.storage.deleteProxy(id);
  }

  /**
   * 批量删除代理
   */
  async deleteProxies(ids: string[]): Promise<void> {
    ids.forEach(id => {
      const proxy = this.proxies.get(id);
      if (proxy) {
        this.proxyKeys.delete(this.getProxyKey(proxy.protocol, proxy.host, proxy.port));
      }
      this.proxies.delete(id);
    });
    await this.storage.deleteProxies(ids);
  }

  /**
   * 获取单个代理
   */
  async getProxy(id: string): Promise<ProxyEntry | null> {
    return this.proxies.get(id) || null;
  }

  /**
   * 获取所有代理
   */
  async getAllProxies(): Promise<ProxyEntry[]> {
    return Array.from(this.proxies.values());
  }

  /**
   * 获取有效代理（支持过滤）
   */
  async getValidProxies(filter?: ProxyFilter): Promise<ProxyEntry[]> {
    let proxies = Array.from(this.proxies.values()).filter(p => p.isValid);

    if (filter) {
      // 协议过滤
      if (filter.protocol) {
        if (filter.protocol === 'http') {
          // http类型包括http和https
          proxies = proxies.filter(p => p.protocol === 'http' || p.protocol === 'https');
        } else if (filter.protocol === 'socks') {
          // socks类型包括socks4和socks5
          proxies = proxies.filter(p => p.protocol === 'socks4' || p.protocol === 'socks5');
        }
      }

      // 地区过滤
      if (filter.region) {
        proxies = proxies.filter(p => p.region === filter.region);
      }

      // 延迟过滤
      if (filter.maxDelay !== undefined) {
        proxies = proxies.filter(p => 
          p.responseTime !== undefined && p.responseTime <= filter.maxDelay!
        );
      }
    }

    return proxies;
  }

  /**
   * 更新代理状态
   */
  async updateProxyStatus(id: string, status: {
    isValid: boolean;
    responseTime?: number;
    lastChecked: Date;
  }): Promise<void> {
    const proxy = this.proxies.get(id);
    if (!proxy) {
      return;
    }

    const updatedProxy: ProxyEntry = {
      ...proxy,
      isValid: status.isValid,
      responseTime: status.responseTime,
      lastChecked: status.lastChecked,
    };

    this.proxies.set(id, updatedProxy);
    await this.storage.saveProxy(updatedProxy);
  }

  /**
   * 批量更新代理状态
   */
  async updateProxiesStatus(results: ValidationResult[]): Promise<void> {
    const updatedProxies: ProxyEntry[] = [];

    for (const result of results) {
      const proxy = this.proxies.get(result.proxyId);
      if (proxy) {
        const updatedProxy: ProxyEntry = {
          ...proxy,
          isValid: result.isValid,
          responseTime: result.responseTime,
          lastChecked: result.timestamp,
        };
        this.proxies.set(result.proxyId, updatedProxy);
        updatedProxies.push(updatedProxy);
      }
    }

    if (updatedProxies.length > 0) {
      await this.storage.saveProxies(updatedProxies);
    }
  }

  /**
   * 获取代理统计
   */
  getStats(): {
    total: number;
    valid: number;
    invalid: number;
  } {
    const all = Array.from(this.proxies.values());
    const valid = all.filter(p => p.isValid).length;
    
    return {
      total: all.length,
      valid,
      invalid: all.length - valid,
    };
  }

  /**
   * 从文件导入代理
   */
  async importFromFile(filePath: string): Promise<{ added: number; duplicates: number }> {
    const proxies = await ImportExport.importProxies(filePath);
    const result = await this.addProxies(proxies);
    
    return {
      added: result.added.length,
      duplicates: result.duplicates,
    };
  }

  /**
   * 导出代理到字符串
   */
  async exportProxies(ids: string[], format: 'txt' | 'csv'): Promise<string> {
    const proxies = ids.map(id => this.proxies.get(id)).filter(p => p !== undefined) as ProxyEntry[];
    
    if (proxies.length === 0) {
      throw new Error('没有选择要导出的代理');
    }
    
    return ImportExport.exportToString(proxies, format);
  }
}
