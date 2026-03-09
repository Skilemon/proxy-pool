import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { electronAPI } from '../api/electron';
import { API_SERVER_CONFIG } from '../../shared/constants';

export default function Settings() {
  const { settings, setSettings, setError, setSuccess, setLoading, loading } = useStore();
  const [apiServerRunning, setApiServerRunning] = useState(false);
  const [formData, setFormData] = useState({
    validationInterval: settings?.validationInterval ?? 10,
    apiServerEnabled: settings?.apiServerEnabled ?? true,
    autoStart: settings?.autoStart ?? false,
  });

  // 当 store 中的 settings 加载完成后同步 formData
  useEffect(() => {
    if (settings) {
      setFormData({
        validationInterval: settings.validationInterval,
        apiServerEnabled: settings.apiServerEnabled,
        autoStart: settings.autoStart,
      });
    }
  }, [settings]);

  useEffect(() => {
    loadSettings();
    checkAPIStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await electronAPI.settings.get();
      setSettings(data);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '加载设置失败');
    }
  };

  const checkAPIStatus = async () => {
    try {
      const status = await electronAPI.apiServer.getStatus();
      setApiServerRunning(status.running);
    } catch {
      setApiServerRunning(false);
    }
  };

  const handleSave = async () => {
    // NaN guard：确保 validationInterval 是有效整数
    const interval = parseInt(String(formData.validationInterval), 10);
    if (isNaN(interval) || interval < 1 || interval > 1440) {
      setError('验证间隔必须在 1-1440 分钟之间');
      return;
    }
    setLoading(true);
    try {
      await electronAPI.settings.update({ ...formData, validationInterval: interval });
      setSuccess('设置保存成功！');
      await loadSettings();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAPIServer = async () => {
    setLoading(true);
    try {
      if (apiServerRunning) {
        await electronAPI.apiServer.stop();
        setSuccess('API服务器已停止');
      } else {
        await electronAPI.apiServer.start();
        setSuccess('API服务器已启动');
      }
      await checkAPIStatus();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-mono">设置</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">配置应用程序选项和 API 服务器</p>
      </div>

      <div className="space-y-6">
        {/* API服务器设置 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API 服务器</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 服务器状态 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">服务器状态</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
                  监听地址: 0.0.0.0:{API_SERVER_CONFIG.PORT}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${
                  apiServerRunning
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {apiServerRunning ? '运行中' : '已停止'}
                </span>
                <button
                  onClick={handleToggleAPIServer}
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 cursor-pointer hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    apiServerRunning
                      ? 'bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg'
                      : 'bg-green-500 hover:bg-green-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {apiServerRunning ? '停止服务' : '启动服务'}
                </button>
              </div>
            </div>

            {/* API端口（从常量读取） */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                API 端口（固定）
              </label>
              <input
                type="number"
                value={API_SERVER_CONFIG.PORT}
                disabled
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-mono cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                API 端口固定为 {API_SERVER_CONFIG.PORT}，无法修改
              </p>
            </div>

            {/* 自动启动API服务器 */}
            <div className="flex items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
              <input
                type="checkbox"
                id="apiServerEnabled"
                checked={formData.apiServerEnabled}
                onChange={(e) => setFormData({ ...formData, apiServerEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-green-500 focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="apiServerEnabled" className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                启动时自动开启 API 服务器
              </label>
            </div>
          </div>
        </div>

        {/* 验证设置 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">代理验证</h3>
            </div>
          </div>
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                自动验证间隔（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={formData.validationInterval}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setFormData({ ...formData, validationInterval: isNaN(val) ? 10 : val });
                }}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                系统将每隔指定时间自动验证所有代理的有效性（1-1440 分钟）
              </p>
            </div>
          </div>
        </div>

        {/* 系统设置 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">系统设置</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
              <input
                type="checkbox"
                id="autoStart"
                checked={formData.autoStart}
                onChange={(e) => setFormData({ ...formData, autoStart: e.target.checked })}
                className="w-5 h-5 rounded text-green-500 focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="autoStart" className="ml-3 cursor-pointer">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">开机自动启动</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">系统启动时自动运行本应用</p>
              </label>
            </div>
          </div>
        </div>

        {/* API使用说明 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API 使用说明</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">获取单个代理：</p>
              <code className="block p-3 bg-slate-900 dark:bg-slate-950 text-green-400 rounded-lg text-sm font-mono overflow-x-auto">
                GET http://localhost:{API_SERVER_CONFIG.PORT}/getSingleProxy
              </code>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">支持的查询参数：</p>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span><code className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">region</code> - 地区筛选（例如: ?region=US）</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span><code className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">type</code> - 协议类型（例如: ?type=http 或 ?type=socks）</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span><code className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">delay</code> - 最大延迟毫秒数（例如: ?delay=1000）</span>
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">健康检查：</p>
              <code className="block p-3 bg-slate-900 dark:bg-slate-950 text-green-400 rounded-lg text-sm font-mono overflow-x-auto">
                GET http://localhost:{API_SERVER_CONFIG.PORT}/health
              </code>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium shadow-lg hover:bg-green-600 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>保存设置</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
