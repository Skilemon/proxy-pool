import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { Storage } from './storage';
import { ProxyManager, SourceManager } from './managers';
import { Validator, ValidationScheduler } from './services';
import { APIServer } from './api';
import { IPCHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let storage: Storage;
let proxyManager: ProxyManager;
let sourceManager: SourceManager;
let validator: Validator;
let validationScheduler: ValidationScheduler;
let apiServer: APIServer;
let ipcHandlers: IPCHandlers;

async function initializeServices() {
  // 初始化存储
  storage = new Storage();

  // 初始化管理器
  proxyManager = new ProxyManager(storage);
  await proxyManager.initialize();

  sourceManager = new SourceManager(storage, proxyManager);
  await sourceManager.initialize();

  // 初始化验证器
  validator = new Validator(proxyManager);

  // 获取设置
  const settings = await storage.getSettings();

  // 用用户设置的间隔初始化调度器
  validationScheduler = new ValidationScheduler(validator, settings.validationInterval ?? 10);

  // 初始化API服务器
  apiServer = new APIServer(proxyManager);

  // 注册IPC处理器
  ipcHandlers = new IPCHandlers(
    proxyManager,
    sourceManager,
    apiServer,
    validator,
    validationScheduler,
    storage
  );
  ipcHandlers.registerHandlers();

  // 启动验证调度器（在代理加载完毕后再启动，避免空跑）
  validationScheduler.start();

  // 根据设置启动API服务器
  if (settings.apiServerEnabled) {
    try {
      await apiServer.start();
    } catch (error) {
      console.error('API服务器启动失败:', error);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 移除默认菜单栏
  Menu.setApplicationMenu(null);

  // 开发环境加载Vite开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    // 清除所有子服务对主窗口的引用
    validator.setMainWindow(null);
    sourceManager.setMainWindow(null);
    ipcHandlers.setMainWindow(null);
    mainWindow = null;
  });

  // 添加错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  // 将主窗口引用传递给所有需要推送事件的服务
  if (mainWindow) {
    ipcHandlers.setMainWindow(mainWindow);
    validator.setMainWindow(mainWindow);
    sourceManager.setMainWindow(mainWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (mainWindow) {
        ipcHandlers.setMainWindow(mainWindow);
        validator.setMainWindow(mainWindow);
        sourceManager.setMainWindow(mainWindow);
      }
    }
  });
});

app.on('window-all-closed', () => {
  // 清理资源
  if (validationScheduler) {
    validationScheduler.stop();
  }
  if (apiServer && apiServer.isRunning()) {
    apiServer.stop().catch(console.error);
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
