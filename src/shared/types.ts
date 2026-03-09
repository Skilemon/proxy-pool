// 代理协议类型
export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

// 代理条目
export interface ProxyEntry {
  id: string;                    // UUID
  protocol: ProxyProtocol;
  host: string;                  // IP地址
  port: number;                  // 端口号 1-65535
  region?: string;               // 地区（可选）
  isValid: boolean;              // 是否有效
  responseTime?: number;         // 响应时间（毫秒）
  lastChecked?: Date;            // 最后检测时间
  createdAt: Date;               // 创建时间
  source?: string;               // 来源标识
}

// 代理来源
export interface ProxySource {
  id: string;                    // UUID
  name: string;                  // 来源名称
  url: string;                   // 来源URL
  format: 'json' | 'text';       // 响应格式
  refreshInterval: number;        // 刷新间隔（分钟）
  priority: number;               // 优先级 1-10
  enabled: boolean;               // 是否启用
  parser?: string;                // JSON路径或解析规则
  lastFetch?: Date;              // 最后获取时间
}

// 应用设置
export interface AppSettings {
  theme: 'light' | 'dark';       // 主题
  autoStart: boolean;             // 开机自启动
  apiServerEnabled: boolean;      // API服务器自动启动
  validationInterval: number;     // 验证间隔（分钟）
}

// 代理过滤器
export interface ProxyFilter {
  protocol?: 'http' | 'socks';   // http包括http和https
  region?: string;
  maxDelay?: number;              // 最大响应时间（毫秒）
}

// 验证结果
export interface ValidationResult {
  proxyId: string;
  isValid: boolean;
  responseTime?: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

// 导入结果
export interface ImportResult {
  added: ProxyEntry[];
  duplicates: number;
}

// 存储数据结构
export interface StorageSchema {
  proxies: ProxyEntry[];
  sources: ProxySource[];
  settings: AppSettings;
}
