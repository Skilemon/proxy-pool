import * as cron from 'node-cron';
import { Validator } from './Validator';

export class ValidationScheduler {
  private validator: Validator;
  private task: cron.ScheduledTask | null = null;
  private intervalMinutes: number;

  constructor(validator: Validator, intervalMinutes: number = 10) {
    this.validator = validator;
    this.intervalMinutes = intervalMinutes;
  }

  // 将分钟数转换为有效的 cron 表达式
  // node-cron 分钟字段范围 0-59，不能直接用 */60 或 */120
  private buildCronExpression(intervalMinutes: number): string {
    if (intervalMinutes < 60) {
      // 小于60分钟：每 N 分钟执行一次
      return `*/${intervalMinutes} * * * *`;
    } else {
      // 60分钟及以上：转换为小时粒度
      const hours = Math.round(intervalMinutes / 60);
      return `0 */${hours} * * *`;
    }
  }

  /**
   * 启动定时验证任务
   */
  start(): void {
    if (this.task) {
      console.log('定时验证任务已在运行');
      return;
    }

    const cronExpression = this.buildCronExpression(this.intervalMinutes);

    this.task = cron.schedule(cronExpression, async () => {
      console.log(`执行定时验证任务 (间隔: ${this.intervalMinutes}分钟)`);
      await this.validator.validateAll();
    });

    console.log(`定时验证任务已启动，间隔: ${this.intervalMinutes}分钟，cron: ${cronExpression}`);
  }

  /**
   * 停止定时验证任务
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('定时验证任务已停止');
    }
  }

  /**
   * 更新验证间隔
   */
  updateInterval(intervalMinutes: number): void {
    this.intervalMinutes = intervalMinutes;
    // 重启任务以应用新间隔（无论是否正在运行，都重新调度）
    this.stop();
    this.start();
  }

  /**
   * 检查任务是否正在运行
   */
  isRunning(): boolean {
    return this.task !== null;
  }
}
