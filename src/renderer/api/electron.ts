// 封装Electron API调用
const api = window.electronAPI;

// 检查API是否可用
if (!api) {
  console.error('Electron API未加载！请确保应用在Electron环境中运行。');
  throw new Error('Electron API未加载');
}

export const electronAPI = {
  // 代理管理
  proxy: {
    add: api.addProxy,
    import: api.importProxies,
    export: api.exportProxies,
    delete: api.deleteProxies,
    getAll: api.getAllProxies,
    validate: api.validateProxies,
  },

  // 来源管理
  source: {
    add: api.addSource,
    update: api.updateSource,
    delete: api.deleteSource,
    getAll: api.getAllSources,
    fetch: api.fetchFromSource,
  },

  // API服务器
  apiServer: {
    start: api.startAPI,
    stop: api.stopAPI,
    getStatus: api.getAPIStatus,
  },

  // 设置
  settings: {
    get: api.getSettings,
    update: api.updateSettings,
  },

  // 事件监听（各方法返回取消订阅函数）
  events: {
    onProxyUpdated: api.onProxyUpdated,
    onProxyStatusChanged: api.onProxyStatusChanged,
    onSourceFetched: api.onSourceFetched,
    onAPIError: api.onAPIError,
  },
};
