// API请求查询参数
export interface GetSingleProxyQuery {
  region?: string;               // 地区过滤
  type?: 'http' | 'socks';      // 协议类型过滤
  delay?: number;                // 最大延迟（毫秒）
}

// API响应 - 获取单个代理
export interface ProxyResponse {
  success: boolean;
  data?: {
    protocol: string;
    host: string;
    port: number;
    region?: string;
    responseTime?: number;
  };
  error?: string;
}

// API响应 - 健康检查
export interface HealthResponse {
  status: 'ok';
  totalProxies: number;
  validProxies: number;
  invalidProxies: number;
  uptime: number;                // 运行时间（秒）
  apiVersion: string;
}

// API错误响应
export interface APIErrorResponse {
  success: false;
  error: string;
  code?: string;
}
