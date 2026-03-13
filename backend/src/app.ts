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
import { createAuthRoutes } from './routes/authRoutes';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { authMiddleware } from './middleware/auth';

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

app.use('/api/auth', createAuthRoutes(settingsService));

app.use('/api/proxies', authMiddleware, createProxyRoutes(proxyService));
app.use('/api/sources', authMiddleware, createSourceRoutes(sourceService, fetcherService));
app.use('/api/stats', authMiddleware, createStatsRoutes(proxyService));
app.use('/api/settings', authMiddleware, createSettingsRoutes(settingsService, schedulerService, validatorService));

app.get('/api/getSingleProxy', async (req: Request, res: Response) => {
  try {
    const protocol = req.query.protocol as string | undefined;
    const maxResponseTime = req.query.delay ? Number(req.query.delay) : undefined;

    const settings = await settingsService.getSettings();
    const candidates = await proxyService.getValidProxyCandidates(protocol, maxResponseTime, 10);

    if (candidates.length === 0) {
      return res.status(404).json({ success: false, error: '没有可用的代理' });
    }

    // 若用户传入 delay，则以此作为校验超时；否则沿用全局设置
    if (maxResponseTime !== undefined) {
      validatorService.setTimeout(maxResponseTime);
    }

    // 沿用全局校验的并发数，逐结果更新数据库
    const candidateMap = new Map(candidates.map(c => [c.id, c]));
    const validationResults: { candidate: typeof candidates[0], result: Awaited<ReturnType<typeof validatorService.validateProxy>> }[] = [];

    await validatorService.validateProxies(candidates, settings.validationConcurrency, async (result) => {
      await proxyService.updateProxyValidation(result.proxyId, result.isValid, result.responseTime);
      const candidate = candidateMap.get(result.proxyId)!;
      validationResults.push({ candidate, result });
    });

    // 恢复全局超时设置
    if (maxResponseTime !== undefined) {
      validatorService.setTimeout(settings.validationTimeout);
    }

    // 从结果中筛出所有满足条件的，再随机返回一条
    const qualifiedList = validationResults.filter(({ result }) => {
      if (!result.isValid) return false;
      if (maxResponseTime !== undefined && result.responseTime! > maxResponseTime) return false;
      return true;
    });

    const matched = qualifiedList.length > 0
      ? qualifiedList[Math.floor(Math.random() * qualifiedList.length)]
      : null;

    if (!matched) {
      return res.status(404).json({ success: false, error: '没有满足条件的可用代理' });
    }

    const { candidate: selectedProxy, result: selectedResult } = matched;
    const auth = selectedProxy.username && selectedProxy.password
      ? `${selectedProxy.username}:${selectedProxy.password}@`
      : '';
    const proxyUrl = `${selectedProxy.protocol}://${auth}${selectedProxy.host}:${selectedProxy.port}`;

    res.json({
      success: true,
      data: {
        proxy: proxyUrl,
        protocol: selectedProxy.protocol,
        host: selectedProxy.host,
        port: selectedProxy.port,
        responseTime: selectedResult.responseTime
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/validate', authMiddleware, (req: Request, res: Response) => {
  if (!schedulerService.tryLockValidation()) {
    return res.json({ success: false, message: '验证任务已在运行中' });
  }
  schedulerService.runValidation().catch((error) => {
    console.error('验证任务执行失败:', error);
  });
  res.json({ success: true, message: '验证任务已启动' });
});

app.post('/api/fetch', authMiddleware, (req: Request, res: Response) => {
  if (!schedulerService.tryLockFetch()) {
    return res.json({ success: false, message: '获取任务已在运行中' });
  }
  schedulerService.runFetch().catch((error) => {
    console.error('获取任务执行失败:', error);
  });
  res.json({ success: true, message: '获取任务已启动' });
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
