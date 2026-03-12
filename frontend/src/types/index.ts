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
  lastFetched?: string;
  createdAt: string;
}

export interface AppSettings {
  validationInterval: number;
  fetchInterval: number;
  validationTimeout: number;
  validationConcurrency: number;
  testUrl: string;
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
