import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { initDatabase, closeDatabase } from './database/connection';
import { ProxyService } from './services/ProxyService';
import { SourceService } from './services/SourceService';
import { ValidatorService } from './services/ValidatorService';
import { FetcherService } from './services/FetcherService';
import { SettingsService } from './services/SettingsService';
import { SchedulerService } from './services/SchedulerService';

import { createProxyRoutes } from './routes/proxyRoutes';
import { createSourceRoutes } from './routes/sourceRoutes';
import { createStatsRoutes } from './routes/statsRoutes';
import { createSettingsRoutes } from './routes/settingsRoutes';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8416;

const proxyService = new ProxyService();
const sourceService = new SourceService();
const validatorService = new ValidatorService();
const fetcherService = new FetcherService(proxyService, sourceService);
const settingsService = new SettingsService();
const schedulerService = new SchedulerService(proxyService, validatorService, fetcherService, settingsService);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, error: '请求过于频繁，请稍后再试' }
});

app.use('/api', apiLimiter);

app.use('/api/proxies', createProxyRoutes(proxyService));
app.use('/api/sources', createSourceRoutes(sourceService, fetcherService));
app.use('/api/stats', createStatsRoutes(proxyService));
app.use('/api/settings', createSettingsRoutes(settingsService, schedulerService, validatorService));

app.get('/api/getSingleProxy', async (req: Request, res: Response) => {
  try {
    const protocol = req.query.protocol as string | undefined;
    const proxy = await proxyService.getValidProxy(protocol);

    if (!proxy) {
      return res.status(404).json({ success: false, error: '没有可用的代理' });
    }

    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    const proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;

    res.json({
      success: true,
      data: {
        proxy: proxyUrl,
        protocol: proxy.protocol,
        host: proxy.host,
        port: proxy.port,
        responseTime: proxy.responseTime
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/validate', async (req: Request, res: Response) => {
  try {
    await schedulerService.runValidation();
    res.json({ success: true, message: '验证任务已启动' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/fetch', async (req: Request, res: Response) => {
  try {
    await schedulerService.runFetch();
    res.json({ success: true, message: '获取任务已启动' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ success: false, error: '页面不存在' });
    }
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化完成');

    await schedulerService.start();
    console.log('调度器启动完成');

    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  schedulerService.stop();
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n正在关闭服务器...');
  schedulerService.stop();
  await closeDatabase();
  process.exit(0);
});

startServer();
