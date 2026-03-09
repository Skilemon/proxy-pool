import type { ProxyEntry, ProxySource, AppSettings, ValidationResult } from '../shared/types';

export interface ElectronAPI {
  // 代理管理
  addProxy: (proxy: Omit<ProxyEntry, 'id' | 'createdAt'>) => Promise<ProxyEntry>;
  importProxies: () => Promise<{ success: boolean; imported: number; skipped: number }>;
  exportProxies: (ids?: string[]) => Promise<{ success: boolean; path?: string }>;
  deleteProxies: (ids: string[]) => Promise<void>;
  getAllProxies: () => Promise<ProxyEntry[]>;
  validateProxies: (ids: string[]) => Promise<void>;

  // 来源管理
  addSource: (source: Omit<ProxySource, 'id'>) => Promise<ProxySource>;
  updateSource: (id: string, updates: Partial<ProxySource>) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
  getAllSources: () => Promise<ProxySource[]>;
  fetchFromSource: (id: string) => Promise<{ count: number }>;

  // API服务器
  startAPI: () => Promise<void>;
  stopAPI: () => Promise<void>;
  getAPIStatus: () => Promise<{ running: boolean }>;

  // 设置
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // 事件监听（均返回取消订阅函数）
  onProxyUpdated: (callback: (proxies: ProxyEntry[]) => void) => () => void;
  onProxyStatusChanged: (callback: (id: string, status: ValidationResult) => void) => () => void;
  onSourceFetched: (callback: (sourceId: string, count: number) => void) => () => void;
  onAPIError: (callback: (error: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
