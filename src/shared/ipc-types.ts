import { ProxyEntry, ProxySource, AppSettings, ValidationResult } from './types';

// IPC通道名称
export const IPC_CHANNELS = {
  // 代理管理
  PROXY_ADD: 'proxy:add',
  PROXY_IMPORT: 'proxy:import',
  PROXY_EXPORT: 'proxy:export',
  PROXY_DELETE: 'proxy:delete',
  PROXY_GET_ALL: 'proxy:getAll',
  PROXY_VALIDATE: 'proxy:validate',

  // 来源管理
  SOURCE_ADD: 'source:add',
  SOURCE_UPDATE: 'source:update',
  SOURCE_DELETE: 'source:delete',
  SOURCE_GET_ALL: 'source:getAll',
  SOURCE_FETCH: 'source:fetch',

  // API服务器
  API_START: 'api:start',
  API_STOP: 'api:stop',
  API_STATUS: 'api:status',

  // 设置
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
} as const;

// IPC事件名称
export const IPC_EVENTS = {
  PROXY_UPDATED: 'proxy:updated',
  PROXY_STATUS_CHANGED: 'proxy:statusChanged',
  SOURCE_FETCHED: 'source:fetched',
  API_ERROR: 'api:error',
} as const;

// 渲染进程 -> 主进程的请求类型
export interface IPCRequests {
  [IPC_CHANNELS.PROXY_ADD]: {
    args: [Omit<ProxyEntry, 'id' | 'createdAt'>];
    return: ProxyEntry;
  };
  [IPC_CHANNELS.PROXY_IMPORT]: {
    args: [];
    return: { success: boolean; imported: number; skipped: number };
  };
  [IPC_CHANNELS.PROXY_EXPORT]: {
    args: [string[], 'txt' | 'csv'];
    return: string;
  };
  [IPC_CHANNELS.PROXY_DELETE]: {
    args: [string[]];
    return: void;
  };
  [IPC_CHANNELS.PROXY_GET_ALL]: {
    args: [];
    return: ProxyEntry[];
  };
  [IPC_CHANNELS.PROXY_VALIDATE]: {
    args: [string[]];
    return: void;
  };
  [IPC_CHANNELS.SOURCE_ADD]: {
    args: [Omit<ProxySource, 'id'>];
    return: ProxySource;
  };
  [IPC_CHANNELS.SOURCE_UPDATE]: {
    args: [string, Partial<ProxySource>];
    return: void;
  };
  [IPC_CHANNELS.SOURCE_DELETE]: {
    args: [string];
    return: void;
  };
  [IPC_CHANNELS.SOURCE_GET_ALL]: {
    args: [];
    return: ProxySource[];
  };
  [IPC_CHANNELS.SOURCE_FETCH]: {
    args: [string];
    return: { count: number };
  };
  [IPC_CHANNELS.API_START]: {
    args: [];
    return: void;
  };
  [IPC_CHANNELS.API_STOP]: {
    args: [];
    return: void;
  };
  [IPC_CHANNELS.API_STATUS]: {
    args: [];
    return: boolean;
  };
  [IPC_CHANNELS.SETTINGS_GET]: {
    args: [];
    return: AppSettings;
  };
  [IPC_CHANNELS.SETTINGS_UPDATE]: {
    args: [Partial<AppSettings>];
    return: void;
  };
}

// 主进程 -> 渲染进程的事件类型
export interface IPCEventPayloads {
  [IPC_EVENTS.PROXY_UPDATED]: ProxyEntry[];
  [IPC_EVENTS.PROXY_STATUS_CHANGED]: { id: string; status: ValidationResult };
  [IPC_EVENTS.SOURCE_FETCHED]: { sourceId: string; count: number };
  [IPC_EVENTS.API_ERROR]: string;
}
