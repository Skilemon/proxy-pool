// 验证器配置
export const VALIDATOR_CONFIG = {
  TEST_URL: 'https://cp.cloudflare.com/generate_204',
  CHECK_INTERVAL: 10 * 60 * 1000,  // 10分钟
  CONCURRENT_LIMIT: 50,             // 并发限制
  TIMEOUT: 10000,                   // 超时时间10秒
  EXPECTED_STATUS: 204,             // 期望的HTTP状态码
} as const;

// API服务器配置
export const API_SERVER_CONFIG = {
  HOST: '0.0.0.0',
  PORT: 8416,
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000,          // 1分钟
    MAX_REQUESTS: 60,               // 最大请求数
  },
} as const;

// 默认代理来源
export const DEFAULT_PROXY_SOURCE = {
  id: 'pikachu-default',
  name: 'Pikachu Free Proxy',
  url: 'https://charlespikachu.github.io/freeproxy/proxies.json',
  format: 'json' as const,
  refreshInterval: 60,              // 60分钟
  priority: 5,
  enabled: true,
  parser: 'data',                   // JSON路径 - 数据在data字段下
};

// 默认应用设置
export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  autoStart: false,
  apiServerEnabled: true,
  validationInterval: 10,           // 10分钟
};

// 端口范围
export const PORT_RANGE = {
  MIN: 1,
  MAX: 65535,
} as const;

// 支持的协议
export const SUPPORTED_PROTOCOLS = ['http', 'https', 'socks4', 'socks5'] as const;

// 支持的导出格式
export const EXPORT_FORMATS = ['txt', 'csv'] as const;

// 支持的导入格式
export const IMPORT_FORMATS = ['txt', 'csv'] as const;
