import { contextBridge, ipcRenderer } from 'electron';

// 定义IPC通道常量（直接在这里定义，避免导入问题）
const IPC_CHANNELS = {
  PROXY_ADD: 'proxy:add',
  PROXY_IMPORT: 'proxy:import',
  PROXY_EXPORT: 'proxy:export',
  PROXY_DELETE: 'proxy:delete',
  PROXY_GET_ALL: 'proxy:getAll',
  PROXY_VALIDATE: 'proxy:validate',
  SOURCE_ADD: 'source:add',
  SOURCE_UPDATE: 'source:update',
  SOURCE_DELETE: 'source:delete',
  SOURCE_GET_ALL: 'source:getAll',
  SOURCE_FETCH: 'source:fetch',
  API_START: 'api:start',
  API_STOP: 'api:stop',
  API_STATUS: 'api:status',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
} as const;

const IPC_EVENTS = {
  PROXY_UPDATED: 'proxy:updated',
  PROXY_STATUS_CHANGED: 'proxy:statusChanged',
  SOURCE_FETCHED: 'source:fetched',
  API_ERROR: 'api:error',
} as const;

// 暴露IPC通信接口到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 代理管理
  addProxy: (proxy: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_ADD, proxy),
  importProxies: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_IMPORT),
  exportProxies: (ids?: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_EXPORT, ids),
  deleteProxies: (ids: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_DELETE, ids),
  getAllProxies: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_GET_ALL),
  validateProxies: (ids: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_VALIDATE, ids),

  // 来源管理
  addSource: (source: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.SOURCE_ADD, source),
  updateSource: (id: string, updates: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.SOURCE_UPDATE, id, updates),
  deleteSource: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SOURCE_DELETE, id),
  getAllSources: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SOURCE_GET_ALL),
  fetchFromSource: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SOURCE_FETCH, id),

  // API服务器
  startAPI: () =>
    ipcRenderer.invoke(IPC_CHANNELS.API_START),
  stopAPI: () =>
    ipcRenderer.invoke(IPC_CHANNELS.API_STOP),
  getAPIStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.API_STATUS),

  // 设置
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

  // 事件监听（返回取消订阅函数，供 useEffect 清理用）
  onProxyUpdated: (callback: (proxies: any[]) => void) => {
    const handler = (_event: any, proxies: any[]) => callback(proxies);
    ipcRenderer.on(IPC_EVENTS.PROXY_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_EVENTS.PROXY_UPDATED, handler);
  },
  onProxyStatusChanged: (callback: (id: string, status: any) => void) => {
    const handler = (_event: any, id: string, status: any) => callback(id, status);
    ipcRenderer.on(IPC_EVENTS.PROXY_STATUS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_EVENTS.PROXY_STATUS_CHANGED, handler);
  },
  onSourceFetched: (callback: (sourceId: string, count: number) => void) => {
    const handler = (_event: any, sourceId: string, count: number) => callback(sourceId, count);
    ipcRenderer.on(IPC_EVENTS.SOURCE_FETCHED, handler);
    return () => ipcRenderer.removeListener(IPC_EVENTS.SOURCE_FETCHED, handler);
  },
  onAPIError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error);
    ipcRenderer.on(IPC_EVENTS.API_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_EVENTS.API_ERROR, handler);
  },
});
