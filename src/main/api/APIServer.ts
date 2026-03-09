import express, { Express, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Server } from 'http';
import { ProxyManager } from '../managers';
import { API_SERVER_CONFIG } from '../../shared/constants';
import { ProxyResponse, HealthResponse, GetSingleProxyQuery } from '../../shared/api-types';

export class APIServer {
  private app: Express;
  private server: Server | null = null;
  private proxyManager: ProxyManager;
  private usedProxies: Set<string> = new Set();
  private startTime: number = Date.now();

  constructor(proxyManager: ProxyManager) {
    this.proxyManager = proxyManager;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // JSON解析
    this.app.use(express.json());

    // 速率限制（仅限本地回环访问）
    const limiter = rateLimit({
      windowMs: API_SERVER_CONFIG.RATE_LIMIT.WINDOW_MS,
      max: API_SERVER_CONFIG.RATE_LIMIT.MAX_REQUESTS,
      message: { success: false, error: '请求过于频繁，请稍后再试' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // CORS：仅允许本地来源
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        res.header('Access-Control-Allow-Origin', origin || '*');
      }
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', this.handleHealth.bind(this));

    // 获取单个代理
    this.app.get('/getSingleProxy', this.handleGetSingleProxy.bind(this));

    // 404处理
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: '接口不存在',
      });
    });

    // 错误处理中间件（必须在所有路由之后注册）
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API错误:', err);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    });
  }

  /**
   * 处理健康检查请求
   */
  private async handleHealth(req: Request, res: Response): Promise<void> {
    const stats = this.proxyManager.getStats();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    const response: HealthResponse = {
      status: 'ok',
      totalProxies: stats.total,
      validProxies: stats.valid,
      invalidProxies: stats.invalid,
      uptime,
      apiVersion: '1.0.0',
    };

    res.json(response);
  }

  /**
   * 处理获取单个代理请求
   */
  private async handleGetSingleProxy(req: Request, res: Response): Promise<void> {
    try {
      const query: GetSingleProxyQuery = {
        region: req.query.region as string | undefined,
        type: req.query.type as 'http' | 'socks' | undefined,
        delay: req.query.delay ? parseInt(req.query.delay as string, 10) : undefined,
      };

      // 获取有效代理
      const validProxies = await this.proxyManager.getValidProxies({
        protocol: query.type,
        region: query.region,
        maxDelay: query.delay,
      });

      if (validProxies.length === 0) {
        res.status(404).json({
          success: false,
          error: '没有可用的代理',
        } as ProxyResponse);
        return;
      }

      // 过滤掉已使用的代理，同时清理已不存在的 id
      const validIdSet = new Set(validProxies.map(p => p.id));
      for (const id of this.usedProxies) {
        if (!validIdSet.has(id)) {
          this.usedProxies.delete(id);
        }
      }

      const availableProxies = validProxies.filter(p => !this.usedProxies.has(p.id));

      // 如果所有代理都被使用过，清空已使用集合重新轮换
      if (availableProxies.length === 0) {
        this.usedProxies.clear();
        availableProxies.push(...validProxies);
      }

      // 随机选择一个代理
      const proxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
      this.usedProxies.add(proxy.id);

      const response: ProxyResponse = {
        success: true,
        data: {
          protocol: proxy.protocol,
          host: proxy.host,
          port: proxy.port,
          region: proxy.region,
          responseTime: proxy.responseTime,
        },
      };

      res.json(response);
    } catch (error: any) {
      console.error('获取代理失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取代理失败',
      } as ProxyResponse);
    }
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (this.server) {
      throw new Error('API服务器已在运行');
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(
          API_SERVER_CONFIG.PORT,
          API_SERVER_CONFIG.HOST,
          () => {
            console.log(`API服务器已启动: http://${API_SERVER_CONFIG.HOST}:${API_SERVER_CONFIG.PORT}`);
            this.startTime = Date.now();
            resolve();
          }
        );

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`端口 ${API_SERVER_CONFIG.PORT} 已被占用`));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.server = null;
          console.log('API服务器已停止');
          resolve();
        }
      });
    });
  }

  /**
   * 检查服务器是否正在运行
   */
  isRunning(): boolean {
    return this.server !== null;
  }
}
