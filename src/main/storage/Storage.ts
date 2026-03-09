import Store from 'electron-store';
import { ProxyEntry, ProxySource, AppSettings, StorageSchema } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export class Storage {
  private store: Store<StorageSchema>;

  constructor() {
    this.store = new Store<StorageSchema>({
      defaults: {
        proxies: [],
        sources: [],
        settings: DEFAULT_SETTINGS,
      },
    });
  }

  // ==================== 代理操作 ====================

  /**
   * 保存单个代理
   */
  async saveProxy(proxy: ProxyEntry): Promise<void> {
    const proxies = this.store.get('proxies', []);
    const index = proxies.findIndex(p => p.id === proxy.id);
    
    if (index >= 0) {
      // 更新现有代理
      proxies[index] = proxy;
    } else {
      // 添加新代理
      proxies.push(proxy);
    }
    
    this.store.set('proxies', proxies);
  }

  /**
   * 批量保存代理
   */
  async saveProxies(proxies: ProxyEntry[]): Promise<void> {
    const existingProxies = this.store.get('proxies', []);
    const proxyMap = new Map(existingProxies.map(p => [p.id, p]));
    
    // 更新或添加代理
    proxies.forEach(proxy => {
      proxyMap.set(proxy.id, proxy);
    });
    
    this.store.set('proxies', Array.from(proxyMap.values()));
  }

  /**
   * 获取所有代理
   */
  async getProxies(): Promise<ProxyEntry[]> {
    return this.store.get('proxies', []);
  }

  /**
   * 获取单个代理
   */
  async getProxy(id: string): Promise<ProxyEntry | null> {
    const proxies = this.store.get('proxies', []);
    return proxies.find(p => p.id === id) || null;
  }

  /**
   * 删除单个代理
   */
  async deleteProxy(id: string): Promise<void> {
    const proxies = this.store.get('proxies', []);
    const filtered = proxies.filter(p => p.id !== id);
    this.store.set('proxies', filtered);
  }

  /**
   * 批量删除代理
   */
  async deleteProxies(ids: string[]): Promise<void> {
    const proxies = this.store.get('proxies', []);
    const idSet = new Set(ids);
    const filtered = proxies.filter(p => !idSet.has(p.id));
    this.store.set('proxies', filtered);
  }

  /**
   * 清空所有代理
   */
  async clearProxies(): Promise<void> {
    this.store.set('proxies', []);
  }

  // ==================== 来源操作 ====================

  /**
   * 保存单个来源
   */
  async saveSource(source: ProxySource): Promise<void> {
    const sources = this.store.get('sources', []);
    const index = sources.findIndex(s => s.id === source.id);
    
    if (index >= 0) {
      // 更新现有来源
      sources[index] = source;
    } else {
      // 添加新来源
      sources.push(source);
    }
    
    this.store.set('sources', sources);
  }

  /**
   * 获取所有来源
   */
  async getSources(): Promise<ProxySource[]> {
    return this.store.get('sources', []);
  }

  /**
   * 获取单个来源
   */
  async getSource(id: string): Promise<ProxySource | null> {
    const sources = this.store.get('sources', []);
    return sources.find(s => s.id === id) || null;
  }

  /**
   * 删除单个来源
   */
  async deleteSource(id: string): Promise<void> {
    const sources = this.store.get('sources', []);
    const filtered = sources.filter(s => s.id !== id);
    this.store.set('sources', filtered);
  }

  /**
   * 更新来源
   */
  async updateSource(id: string, updates: Partial<ProxySource>): Promise<void> {
    const sources = this.store.get('sources', []);
    const index = sources.findIndex(s => s.id === id);
    
    if (index >= 0) {
      sources[index] = { ...sources[index], ...updates };
      this.store.set('sources', sources);
    }
  }

  // ==================== 设置操作 ====================

  /**
   * 获取应用设置
   */
  async getSettings(): Promise<AppSettings> {
    return this.store.get('settings', DEFAULT_SETTINGS);
  }

  /**
   * 更新应用设置
   */
  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const currentSettings = this.store.get('settings', DEFAULT_SETTINGS);
    const newSettings = { ...currentSettings, ...settings };
    this.store.set('settings', newSettings);
  }

  /**
   * 重置设置为默认值
   */
  async resetSettings(): Promise<void> {
    this.store.set('settings', DEFAULT_SETTINGS);
  }

  // ==================== 工具方法 ====================

  /**
   * 获取存储文件路径
   */
  getStorePath(): string {
    return this.store.path;
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    this.store.clear();
  }
}
