import axios from 'axios';
import { BrowserWindow } from 'electron';
import { ProxySource, ProxyEntry } from '../../shared/types';
import { generateId, parseProxy } from '../../shared/utils';
import { DEFAULT_PROXY_SOURCE } from '../../shared/constants';
import { IPC_EVENTS } from '../../shared/ipc-types';
import { Storage } from '../storage';
import { ProxyManager } from './ProxyManager';

export class SourceManager {
  private storage: Storage;
  private proxyManager: ProxyManager;
  private sources: Map<string, ProxySource>;
  private mainWindow: BrowserWindow | null = null;

  constructor(storage: Storage, proxyManager: ProxyManager) {
    this.storage = storage;
    this.proxyManager = proxyManager;
    this.sources = new Map();
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * 初始化 - 从存储加载来源并添加默认来源
   */
  async initialize(): Promise<void> {
    const savedSources = await this.storage.getSources();
    this.sources.clear();

    savedSources.forEach(source => {
      this.sources.set(source.id, source);
    });

    // 如果没有默认来源，直接用固定 id 存储；如果有，更新配置
    const existingDefault = this.sources.get(DEFAULT_PROXY_SOURCE.id);
    if (!existingDefault) {
      // 直接用完整对象（含固定 id）保存，不走 addSource()
      const defaultSource: ProxySource = { ...DEFAULT_PROXY_SOURCE };
      this.sources.set(defaultSource.id, defaultSource);
      await this.storage.saveSource(defaultSource);
    } else {
      // 更新默认来源的配置（特别是parser字段）
      await this.updateSource(DEFAULT_PROXY_SOURCE.id, {
        url: DEFAULT_PROXY_SOURCE.url,
        parser: DEFAULT_PROXY_SOURCE.parser,
        format: DEFAULT_PROXY_SOURCE.format,
      });
    }
  }

  /**
   * 添加来源
   */
  async addSource(source: Omit<ProxySource, 'id'>): Promise<ProxySource> {
    const newSource: ProxySource = {
      ...source,
      id: generateId(),
    };

    this.sources.set(newSource.id, newSource);
    await this.storage.saveSource(newSource);

    return newSource;
  }

  /**
   * 删除来源
   */
  async deleteSource(id: string): Promise<void> {
    // 不允许删除默认来源
    if (id === DEFAULT_PROXY_SOURCE.id) {
      throw new Error('不能删除默认代理来源');
    }

    this.sources.delete(id);
    await this.storage.deleteSource(id);
  }

  /**
   * 更新来源
   */
  async updateSource(id: string, updates: Partial<ProxySource>): Promise<void> {
    const source = this.sources.get(id);
    if (!source) {
      throw new Error(`来源不存在: ${id}`);
    }

    const updatedSource = { ...source, ...updates };
    this.sources.set(id, updatedSource);
    await this.storage.saveSource(updatedSource);
  }

  /**
   * 获取所有来源
   */
  async getAllSources(): Promise<ProxySource[]> {
    return Array.from(this.sources.values());
  }

  /**
   * 获取单个来源
   */
  async getSource(id: string): Promise<ProxySource | null> {
    return this.sources.get(id) || null;
  }

  /**
   * 从来源获取代理
   */
  async fetchFromSource(sourceId: string): Promise<number> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`来源不存在: ${sourceId}`);
    }

    if (!source.enabled) {
      throw new Error(`来源已禁用: ${source.name}`);
    }

    try {
      console.log(`从来源获取代理: ${source.name} (${source.url})`);

      // 获取数据
      const response = await axios.get(source.url, {
        timeout: 30000, // 30秒超时
      });

      // 解析响应
      const proxies = this.parseResponse(source, response.data);

      // 添加代理到ProxyManager
      const result = await this.proxyManager.addProxies(proxies);

      // 更新最后获取时间
      await this.updateSource(sourceId, { lastFetch: new Date() });

      console.log(`从 ${source.name} 获取了 ${result.added.length} 个新代理，跳过 ${result.duplicates} 个重复`);

      // 推送 source:fetched 事件到渲染进程
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_EVENTS.SOURCE_FETCHED, sourceId, result.added.length);
        // 同时推送更新后的完整代理列表
        const updatedProxies = await this.proxyManager.getAllProxies();
        this.mainWindow.webContents.send(IPC_EVENTS.PROXY_UPDATED, updatedProxies);
      }

      return result.added.length;
    } catch (error: any) {
      console.error(`从来源获取代理失败 (${source.name}):`, error.message);
      throw error;
    }
  }

  /**
   * 解析响应数据
   */
  private parseResponse(source: ProxySource, data: any): Omit<ProxyEntry, 'id' | 'createdAt'>[] {
    const proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[] = [];

    if (source.format === 'json') {
      // JSON格式解析
      proxies.push(...this.parseJsonResponse(source, data));
    } else {
      // 纯文本格式解析
      proxies.push(...this.parseTextResponse(data));
    }

    // 添加来源标识
    return proxies.map(proxy => ({
      ...proxy,
      source: source.id,
    }));
  }

  /**
   * 解析JSON响应
   */
  private parseJsonResponse(source: ProxySource, data: any): Omit<ProxyEntry, 'id' | 'createdAt'>[] {
    const proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[] = [];

    try {
      // 使用parser字段作为JSON路径
      let proxyList = data;

      console.log('开始解析JSON，parser:', source.parser);
      console.log('原始数据类型:', typeof data);
      console.log('原始数据键:', Object.keys(data));

      if (source.parser) {
        const keys = source.parser.split('.');
        for (const key of keys) {
          console.log(`访问键: ${key}, 当前类型:`, typeof proxyList);
          proxyList = proxyList[key];
        }
      }

      console.log('解析后的proxyList类型:', typeof proxyList);
      console.log('是否为数组:', Array.isArray(proxyList));
      if (Array.isArray(proxyList)) {
        console.log('数组长度:', proxyList.length);
      }

      if (!Array.isArray(proxyList)) {
        console.warn('JSON响应不是数组格式');
        return proxies;
      }

      // 解析每个代理对象
      for (const item of proxyList) {
        if (typeof item === 'string') {
          // 字符串格式: "protocol://host:port"
          const parsed = parseProxy(item);
          if (parsed) {
            proxies.push({
              protocol: parsed.protocol as any,
              host: parsed.host,
              port: parsed.port,
              isValid: false,
            });
          }
        } else if (typeof item === 'object') {
          // 对象格式: { protocol, host, port, ... }
          const protocol = (item.protocol || item.type || 'http').toLowerCase();
          const host = item.host || item.ip || item.address;
          const port = item.port;
          const region = item.region || item.country || item.location;

          if (host && port) {
            proxies.push({
              protocol: protocol as any,
              host,
              port: typeof port === 'string' ? parseInt(port, 10) : port,
              region,
              isValid: false,
            });
          }
        }
      }

      console.log(`成功解析 ${proxies.length} 个代理`);
    } catch (error) {
      console.error('解析JSON响应失败:', error);
    }

    return proxies;
  }

  /**
   * 解析纯文本响应
   */
  private parseTextResponse(data: string): Omit<ProxyEntry, 'id' | 'createdAt'>[] {
    const proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[] = [];
    const lines = data.split(/\r?\n/).filter(line => line.trim());

    for (const line of lines) {
      const parsed = parseProxy(line.trim());
      if (parsed) {
        proxies.push({
          protocol: parsed.protocol as any,
          host: parsed.host,
          port: parsed.port,
          isValid: false,
        });
      }
    }

    return proxies;
  }
}
