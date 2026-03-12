import cron from 'node-cron';
import { ProxyService } from './ProxyService';
import { ValidatorService } from './ValidatorService';
import { FetcherService } from './FetcherService';
import { SettingsService } from './SettingsService';

export class SchedulerService {
  private proxyService: ProxyService;
  private validatorService: ValidatorService;
  private fetcherService: FetcherService;
  private settingsService: SettingsService;

  private validationTask: cron.ScheduledTask | null = null;
  private fetchTask: cron.ScheduledTask | null = null;

  constructor(
    proxyService: ProxyService,
    validatorService: ValidatorService,
    fetcherService: FetcherService,
    settingsService: SettingsService
  ) {
    this.proxyService = proxyService;
    this.validatorService = validatorService;
    this.fetcherService = fetcherService;
    this.settingsService = settingsService;
  }

  async start(): Promise<void> {
    const settings = await this.settingsService.getSettings();

    this.validatorService.setTestUrl(settings.testUrl);
    this.validatorService.setTimeout(settings.validationTimeout);

    this.startValidationSchedule(settings.validationInterval);
    this.startFetchSchedule(settings.fetchInterval);

    console.log('调度器已启动');
  }

  stop(): void {
    if (this.validationTask) {
      this.validationTask.stop();
      this.validationTask = null;
    }

    if (this.fetchTask) {
      this.fetchTask.stop();
      this.fetchTask = null;
    }

    console.log('调度器已停止');
  }

  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  private startValidationSchedule(intervalMinutes: number): void {
    if (this.validationTask) {
      this.validationTask.stop();
    }

    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.validationTask = cron.schedule(cronExpression, async () => {
      console.log('开始定时验证代理...');
      await this.runValidation();
    });

    console.log(`验证调度已设置: 每 ${intervalMinutes} 分钟`);
  }

  private startFetchSchedule(intervalMinutes: number): void {
    if (this.fetchTask) {
      this.fetchTask.stop();
    }

    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.fetchTask = cron.schedule(cronExpression, async () => {
      console.log('开始定时获取代理...');
      await this.runFetch();
    });

    console.log(`获取调度已设置: 每 ${intervalMinutes} 分钟`);
  }

  async runValidation(): Promise<void> {
    try {
      const proxies = await this.proxyService.getAllProxies();
      if (proxies.length === 0) {
        console.log('没有代理需要验证');
        return;
      }

      const settings = await this.settingsService.getSettings();
      const results = await this.validatorService.validateProxies(proxies, settings.validationConcurrency);

      for (const result of results) {
        await this.proxyService.updateProxyValidation(result.proxyId, result.isValid, result.responseTime);
      }

      const validCount = results.filter(r => r.isValid).length;
      console.log(`验证完成: ${validCount}/${results.length} 个代理有效`);
    } catch (error) {
      console.error('验证失败:', error);
    }
  }

  async runFetch(): Promise<void> {
    try {
      const result = await this.fetcherService.fetchFromAllSources();
      console.log(`获取完成: 从 ${result.total} 个来源添加了 ${result.added} 个代理，跳过 ${result.duplicates} 个重复`);
    } catch (error) {
      console.error('获取失败:', error);
    }
  }
}
