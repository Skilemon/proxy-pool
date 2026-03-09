import fs from 'fs/promises';
import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-types';
import { ProxyManager, SourceManager } from '../managers';
import { APIServer } from '../api';
import { Storage } from '../storage';
import { Validator, ValidationScheduler } from '../services';

export class IPCHandlers {
  private proxyManager: ProxyManager;
  private sourceManager: SourceManager;
  private apiServer: APIServer;
  private validator: Validator;
  private validationScheduler: ValidationScheduler;
  private storage: Storage;
  private mainWindow: Electron.BrowserWindow | null = null;

  constructor(
    proxyManager: ProxyManager,
    sourceManager: SourceManager,
    apiServer: APIServer,
    validator: Validator,
    validationScheduler: ValidationScheduler,
    storage: Storage
  ) {
    this.proxyManager = proxyManager;
    this.sourceManager = sourceManager;
    this.apiServer = apiServer;
    this.validator = validator;
    this.validationScheduler = validationScheduler;
    this.storage = storage;
  }

  /**
   * 设置主窗口引用（用于文件对话框和事件推送）
   */
  setMainWindow(window: Electron.BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * 注册所有IPC处理器
   */
  registerHandlers(): void {
    this.registerProxyHandlers();
    this.registerSourceHandlers();
    this.registerAPIHandlers();
    this.registerSettingsHandlers();
  }

  /**
   * 注册代理相关处理器
   */
  private registerProxyHandlers(): void {
    // 添加代理
    ipcMain.handle(IPC_CHANNELS.PROXY_ADD, async (event, proxy) => {
      try {
        return await this.proxyManager.addProxy(proxy);
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 导入代理
    ipcMain.handle(IPC_CHANNELS.PROXY_IMPORT, async (event) => {
      try {
        if (!this.mainWindow) {
          throw new Error('主窗口未初始化');
        }

        const result = await dialog.showOpenDialog(this.mainWindow, {
          title: '选择代理文件',
          filters: [
            { name: '文本文件', extensions: ['txt'] },
            { name: 'CSV文件', extensions: ['csv'] },
            { name: '所有文件', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, imported: 0, skipped: 0 };
        }

        const importResult = await this.proxyManager.importFromFile(result.filePaths[0]);
        return {
          success: true,
          imported: importResult.added,
          skipped: importResult.duplicates
        };
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 导出代理
    ipcMain.handle(IPC_CHANNELS.PROXY_EXPORT, async (event, ids?: string[]) => {
      try {
        if (!this.mainWindow) {
          throw new Error('主窗口未初始化');
        }

        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: '导出代理',
          defaultPath: `proxies_${new Date().toISOString().split('T')[0]}.txt`,
          filters: [
            { name: '文本文件', extensions: ['txt'] },
            { name: 'CSV文件', extensions: ['csv'] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return { success: false };
        }

        const format = result.filePath.endsWith('.csv') ? 'csv' : 'txt';
        const exportIds = ids && ids.length > 0
          ? ids
          : (await this.proxyManager.getAllProxies()).map(p => p.id);

        const content = await this.proxyManager.exportProxies(exportIds, format);
        await fs.writeFile(result.filePath, content, 'utf-8');

        return { success: true, path: result.filePath };
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 删除代理
    ipcMain.handle(IPC_CHANNELS.PROXY_DELETE, async (event, ids) => {
      try {
        await this.proxyManager.deleteProxies(ids);
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 获取所有代理
    ipcMain.handle(IPC_CHANNELS.PROXY_GET_ALL, async () => {
      try {
        return await this.proxyManager.getAllProxies();
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 验证代理
    ipcMain.handle(IPC_CHANNELS.PROXY_VALIDATE, async (event, ids) => {
      try {
        await this.validator.validateByIds(ids);
      } catch (error: any) {
        throw new Error(error.message);
      }
    });
  }

  /**
   * 注册来源相关处理器
   */
  private registerSourceHandlers(): void {
    // 添加来源
    ipcMain.handle(IPC_CHANNELS.SOURCE_ADD, async (event, source) => {
      try {
        return await this.sourceManager.addSource(source);
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 更新来源
    ipcMain.handle(IPC_CHANNELS.SOURCE_UPDATE, async (event, id, updates) => {
      try {
        await this.sourceManager.updateSource(id, updates);
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 删除来源
    ipcMain.handle(IPC_CHANNELS.SOURCE_DELETE, async (event, id) => {
      try {
        await this.sourceManager.deleteSource(id);
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 获取所有来源
    ipcMain.handle(IPC_CHANNELS.SOURCE_GET_ALL, async () => {
      try {
        return await this.sourceManager.getAllSources();
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 从来源获取代理
    ipcMain.handle(IPC_CHANNELS.SOURCE_FETCH, async (event, id) => {
      try {
        const count = await this.sourceManager.fetchFromSource(id);
        return { count };
      } catch (error: any) {
        throw new Error(error.message);
      }
    });
  }

  /**
   * 注册API服务器相关处理器
   */
  private registerAPIHandlers(): void {
    // 启动API服务器
    ipcMain.handle(IPC_CHANNELS.API_START, async () => {
      try {
        await this.apiServer.start();
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 停止API服务器
    ipcMain.handle(IPC_CHANNELS.API_STOP, async () => {
      try {
        await this.apiServer.stop();
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 获取API服务器状态
    ipcMain.handle(IPC_CHANNELS.API_STATUS, async () => {
      return { running: this.apiServer.isRunning() };
    });
  }

  /**
   * 注册设置相关处理器
   */
  private registerSettingsHandlers(): void {
    // 获取设置
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
      try {
        return await this.storage.getSettings();
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    // 更新设置
    ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (event, settings) => {
      try {
        await this.storage.updateSettings(settings);
        // 若验证间隔发生变化，同步更新调度器
        if (typeof settings.validationInterval === 'number') {
          this.validationScheduler.updateInterval(settings.validationInterval);
        }
      } catch (error: any) {
        throw new Error(error.message);
      }
    });
  }
}
