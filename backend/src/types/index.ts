export interface ProxyEntry {
  id: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  isValid: boolean;
  lastChecked?: string;
  responseTime?: number;
  createdAt: string;
}

export interface ProxySource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  isDefault: boolean;
  lastFetched?: string;
  createdAt: string;
}

export interface AppSettings {
  validationInterval: number; // 分钟
  fetchInterval: number; // 分钟
  validationTimeout: number; // 毫秒
  validationConcurrency: number;
  testUrl: string;
  clearInvalidOnFetch: boolean; // 获取前是否清除无效代理
}

export interface SocksAccount {
  id: string;
  username: string;
  password: string;
  // rotate: 每次请求换一个代理；sticky: 代理失效后才换
  mode: 'rotate' | 'sticky';
  enabled: boolean;
  createdAt: string;
}

export interface ProxyFilter {
  protocol?: 'http' | 'socks';
  country?: string;
  maxDelay?: number;
}

export interface ValidationResult {
  proxyId: string;
  isValid: boolean;
  responseTime?: number;
  timestamp: string;
}

export interface ImportResult {
  added: ProxyEntry[];
  duplicates: number;
}

export interface ProtocolStats {
  total: number;
  valid: number;
  invalid: number;
}

export interface StatsData {
  total: number;
  valid: number;
  invalid: number;
  byProtocol: Record<string, ProtocolStats>;
}
