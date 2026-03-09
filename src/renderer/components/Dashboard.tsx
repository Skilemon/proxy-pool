import React from 'react';
import { useStore } from '../store/useStore';
import { API_SERVER_CONFIG } from '../../../src/shared/constants';

export default function Dashboard() {
  const { proxies, isInitialized } = useStore();

  const stats = {
    total: proxies.length,
    valid: proxies.filter(p => p.isValid).length,
    invalid: proxies.filter(p => !p.isValid).length,
  };

  const validPercentage = stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : '0';

  const avgResponseTime = (() => {
    const timed = proxies.filter(p => p.isValid && p.responseTime !== undefined);
    if (timed.length === 0) return null;
    const avg = timed.reduce((sum, p) => sum + p.responseTime!, 0) / timed.length;
    return Math.round(avg);
  })();

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
          统计概览
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          实时监控代理池状态和性能指标
        </p>
      </div>

      {!isInitialized ? (
        /* 加载骨架屏 */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-6 bg-slate-200 dark:bg-slate-700 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        /* 统计卡片 */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* 总代理数 */}
          <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">总代理数</p>
                <p className="mt-2 text-4xl font-bold text-white font-mono">{stats.total}</p>
                <p className="mt-2 text-blue-100 text-xs">代理池容量</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          {/* 有效代理 */}
          <div className="group bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">有效代理</p>
                <p className="mt-2 text-4xl font-bold text-white font-mono">{stats.valid}</p>
                <p className="mt-2 text-green-100 text-xs">可用率 {validPercentage}%</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 无效代理 */}
          <div className="group bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">无效代理</p>
                <p className="mt-2 text-4xl font-bold text-white font-mono">{stats.invalid}</p>
                <p className="mt-2 text-red-100 text-xs">需要清理</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 平均响应时间 */}
          {avgResponseTime !== null && (
            <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">平均响应时间</p>
                  <p className="mt-2 text-4xl font-bold text-white font-mono">{avgResponseTime}</p>
                  <p className="mt-2 text-purple-100 text-xs">毫秒（有效代理）</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 快速操作指南 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              快速操作
            </h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            使用顶部导航栏快速切换到不同的功能模块
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">代理列表</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  查看、添加、删除和验证代理，支持批量操作和筛选
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">代理来源</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  管理代理来源，自动获取和更新代理列表
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">设置</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  配置 API 服务器（端口 {API_SERVER_CONFIG.PORT}）、验证间隔和其他应用选项
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
