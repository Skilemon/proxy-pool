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

  public isValidating = false;
  public isFetching = false;

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

    this.validationTask = cron.schedule(cronExpression, () => {
      console.log('开始定时验证代理...');
      if (!this.tryLockValidation()) {
        console.log('验证任务已在运行中，跳过本次定时触发');
        return;
      }
      this.runValidation().catch((error) => console.error('定时验证失败:', error));
    });

    console.log(`验证调度已设置: 每 ${intervalMinutes} 分钟`);
  }

  private startFetchSchedule(intervalMinutes: number): void {
    if (this.fetchTask) {
      this.fetchTask.stop();
    }

    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.fetchTask = cron.schedule(cronExpression, () => {
      console.log('开始定时获取代理...');
      if (!this.tryLockFetch()) {
        console.log('获取任务已在运行中，跳过本次定时触发');
        return;
      }
      this.runFetch().catch((error) => console.error('定时获取失败:', error));
    });

    console.log(`获取调度已设置: 每 ${intervalMinutes} 分钟`);
  }

  tryLockValidation(): boolean {
    if (this.isValidating) return false;
    this.isValidating = true;
    return true;
  }

  async runValidation(ids?: string[]): Promise<void> {
    try {
      const allProxies = await this.proxyService.getAllProxies();
      const proxies = ids && ids.length > 0
        ? allProxies.filter(p => ids.includes(p.id))
        : allProxies;
      if (proxies.length === 0) {
        console.log('没有代理需要验证');
        return;
      }

      const settings = await this.settingsService.getSettings();
      let validCount = 0;
      const onResult = async (result: Awaited<ReturnType<typeof this.validatorService.validateProxy>>) => {
        await this.proxyService.updateProxyValidation(result.proxyId, result.isValid, result.responseTime);
        if (result.isValid) validCount++;
      };

      await this.validatorService.validateProxies(proxies, settings.validationConcurrency, onResult);

      console.log(`验证完成: ${validCount}/${proxies.length} 个代理有效`);
    } catch (error) {
      console.error('验证失败:', error);
    } finally {
      this.isValidating = false;
    }
  }

  tryLockFetch(): boolean {
    if (this.isFetching) return false;
    this.isFetching = true;
    return true;
  }

  async runFetch(): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      if (settings.clearInvalidOnFetch) {
        const deleted = await this.proxyService.deleteInvalidProxies();
        if (deleted > 0) {
          console.log(`已清除 ${deleted} 个无效代理`);
        }
      }
      const result = await this.fetcherService.fetchFromAllSources();
      console.log(`获取完成: 从 ${result.total} 个来源添加了 ${result.added} 个代理，跳过 ${result.duplicates} 个重复`);
    } catch (error) {
      console.error('获取失败:', error);
    } finally {
      this.isFetching = false;
    }
  }
}
