import axios, { AxiosProxyConfig } from 'axios';
import { BrowserWindow } from 'electron';
import { ProxyEntry, ValidationResult } from '../../shared/types';
import { VALIDATOR_CONFIG } from '../../shared/constants';
import { IPC_EVENTS } from '../../shared/ipc-types';
import { ProxyManager } from '../managers';

export class Validator {
  private proxyManager: ProxyManager;
  private isRunning: boolean = false;
  private mainWindow: BrowserWindow | null = null;

  constructor(proxyManager: ProxyManager) {
    this.proxyManager = proxyManager;
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * 验证单个代理
   */
  async validateProxy(proxy: ProxyEntry): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // 配置axios代理
      const proxyConfig: AxiosProxyConfig = {
        protocol: proxy.protocol,
        host: proxy.host,
        port: proxy.port,
      };

      // 发送请求到Cloudflare测试URL
      const response = await axios.get(VALIDATOR_CONFIG.TEST_URL, {
        proxy: proxyConfig,
        timeout: VALIDATOR_CONFIG.TIMEOUT,
        validateStatus: () => true, // 接受所有状态码
      });

      const responseTime = Date.now() - startTime;
      const isValid = response.status === VALIDATOR_CONFIG.EXPECTED_STATUS;

      // 调试：记录非204状态码
      if (!isValid && responseTime < VALIDATOR_CONFIG.TIMEOUT) {
        console.log(`代理 ${proxy.host}:${proxy.port} 返回状态码 ${response.status}，期望 ${VALIDATOR_CONFIG.EXPECTED_STATUS}`);
      }

      return {
        proxyId: proxy.id,
        isValid,
        responseTime,
        statusCode: response.status,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        proxyId: proxy.id,
        isValid: false,
        error: error.message || '请求失败',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 批量验证代理（支持并发限制）
   */
  async validateProxies(proxies: ProxyEntry[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const limit = VALIDATOR_CONFIG.CONCURRENT_LIMIT;

    console.log(`开始批量验证，总数: ${proxies.length}, 并发限制: ${limit}`);

    // 分批处理
    for (let i = 0; i < proxies.length; i += limit) {
      const batch = proxies.slice(i, i + limit);
      console.log(`验证批次 ${Math.floor(i / limit) + 1}/${Math.ceil(proxies.length / limit)}: ${batch.length} 个代理`);

      const batchResults = await Promise.allSettled(
        batch.map(proxy => this.validateProxy(proxy))
      );

      // 收集结果并逐条推送状态变化
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          // 实时推送每条代理的状态变化
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(
              IPC_EVENTS.PROXY_STATUS_CHANGED,
              result.value.proxyId,
              result.value
            );
          }
        }
      });

      const validInBatch = batchResults.filter(r => r.status === 'fulfilled' && (r as any).value.isValid).length;
      console.log(`批次完成，有效: ${validInBatch}/${batch.length}`);
    }

    return results;
  }

  /**
   * 验证所有代理
   */
  async validateAll(): Promise<void> {
    if (this.isRunning) {
      console.log('验证任务正在运行中，跳过本次执行');
      return;
    }

    this.isRunning = true;

    try {
      const proxies = await this.proxyManager.getAllProxies();

      if (proxies.length === 0) {
        console.log('没有代理需要验证');
        return;
      }

      console.log(`开始验证 ${proxies.length} 个代理...`);
      const results = await this.validateProxies(proxies);

      // 更新代理状态
      await this.proxyManager.updateProxiesStatus(results);

      const validCount = results.filter(r => r.isValid).length;
      console.log(`验证完成：${validCount}/${results.length} 个代理有效`);

      // 验证全部完成后推送完整代理列表
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const updatedProxies = await this.proxyManager.getAllProxies();
        this.mainWindow.webContents.send(IPC_EVENTS.PROXY_UPDATED, updatedProxies);
      }
    } catch (error) {
      console.error('验证过程中发生错误:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 验证指定ID的代理
   */
  async validateByIds(ids: string[]): Promise<void> {
    console.log(`收到验证请求，ID数量: ${ids.length}`);

    const proxies: ProxyEntry[] = [];

    for (const id of ids) {
      const proxy = await this.proxyManager.getProxy(id);
      if (proxy) {
        proxies.push(proxy);
      }
    }

    console.log(`找到 ${proxies.length} 个代理需要验证`);

    if (proxies.length === 0) {
      return;
    }

    const results = await this.validateProxies(proxies);
    await this.proxyManager.updateProxiesStatus(results);

    const validCount = results.filter(r => r.isValid).length;
    console.log(`验证完成：${validCount}/${results.length} 个代理有效`);

    // 推送完整更新列表
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const updatedProxies = await this.proxyManager.getAllProxies();
      this.mainWindow.webContents.send(IPC_EVENTS.PROXY_UPDATED, updatedProxies);
    }
  }
}
