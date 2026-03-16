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
  geoipProxyUrl?: string; // GeoIP 数据库下载加速地址
}

export interface SocksAccount {
  id: string;
  username: string;
  password: string;
  // rotate: 每次请求换一个代理；sticky: 代理失效后才换
  mode: 'rotate' | 'sticky';
  enabled: boolean;
  maxDelay?: number; // 最大延迟要求（毫秒），不设则不限制
  countryFilter?: string; // 国家代码，多个用逗号分隔
  countryFilterMode?: 'include' | 'exclude'; // include=只用这些国家，exclude=排除这些国家
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
