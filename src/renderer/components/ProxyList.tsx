import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { electronAPI } from '../api/electron';
import AddProxyModal from './AddProxyModal';

export default function ProxyList() {
  const { proxies, selectedProxyIds, toggleProxySelection, clearSelection, setError, setSuccess, setLoading } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选代理
  const filteredProxies = useMemo(() => {
    return proxies.filter(proxy => {
      if (statusFilter === 'valid' && !proxy.isValid) return false;
      if (statusFilter === 'invalid' && proxy.isValid) return false;
      if (protocolFilter !== 'all' && proxy.protocol !== protocolFilter) return false;
      return true;
    });
  }, [proxies, statusFilter, protocolFilter]);

  // 分页计算
  const totalPages = Math.ceil(filteredProxies.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProxies = filteredProxies.slice(startIndex, endIndex);

  // 当筛选条件改变时重置到第一页
  const handleFilterChange = (newStatusFilter?: string, newProtocolFilter?: string) => {
    if (newStatusFilter !== undefined) setStatusFilter(newStatusFilter as any);
    if (newProtocolFilter !== undefined) setProtocolFilter(newProtocolFilter);
    setCurrentPage(1);
  };

  // 获取所有唯一的协议类型
  const protocols = Array.from(new Set(proxies.map(p => p.protocol)));

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await electronAPI.proxy.import();
      if (result.success) {
        setSuccess(`成功导入 ${result.imported} 条代理，跳过 ${result.skipped} 条重复代理`);
        const updatedProxies = await electronAPI.proxy.getAll();
        useStore.setState({ proxies: updatedProxies });
      }
    } catch (error: any) {
      setError(error.message || '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const ids = selectedProxyIds.length > 0 ? selectedProxyIds : undefined;
      await electronAPI.proxy.export(ids);
      setSuccess('导出成功！');
    } catch (error: any) {
      setError(error.message || '导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedProxyIds.length === 0) {
      setError('请先选择要删除的代理');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await electronAPI.proxy.delete(selectedProxyIds);
      setSuccess(`成功删除 ${selectedProxyIds.length} 条代理`);
      const updatedProxies = await electronAPI.proxy.getAll();
      useStore.setState({ proxies: updatedProxies });
      clearSelection();
    } catch (error: any) {
      setError(error.message || '删除失败');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleValidate = async () => {
    const ids = selectedProxyIds.length > 0 ? selectedProxyIds : proxies.map(p => p.id);
    setLoading(true);
    try {
      await electronAPI.proxy.validate(ids);
      setSuccess(`开始验证 ${ids.length} 条代理...`);
      // UI 刷新由主进程的 proxy:updated / proxy:statusChanged IPC 事件驱动，无需轮询
    } catch (error: any) {
      setError(error.message || '验证失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedProxyIds.length === paginatedProxies.length) {
      clearSelection();
    } else {
      useStore.setState({ selectedProxyIds: paginatedProxies.map(p => p.id) });
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
            代理列表
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            共 {filteredProxies.length} 条代理{filteredProxies.length !== proxies.length && ` / 总计 ${proxies.length} 条`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>添加</span>
            </div>
          </button>
          <button 
            onClick={handleImport}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>导入</span>
            </div>
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={proxies.length === 0}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>导出</span>
            </div>
          </button>
          <button 
            onClick={handleValidate}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={proxies.length === 0}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>验证{selectedProxyIds.length > 0 ? `(${selectedProxyIds.length})` : ''}</span>
            </div>
          </button>
          <button 
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedProxyIds.length === 0}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>删除({selectedProxyIds.length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* 筛选器和分页设置 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 状态筛选 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              状态:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value, undefined)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 cursor-pointer"
            >
              <option value="all">全部</option>
              <option value="valid">有效</option>
              <option value="invalid">无效</option>
            </select>
          </div>

          {/* 协议筛选 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              协议:
            </label>
            <select
              value={protocolFilter}
              onChange={(e) => handleFilterChange(undefined, e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 cursor-pointer"
            >
              <option value="all">全部</option>
              {protocols.map(protocol => (
                <option key={protocol} value={protocol}>
                  {protocol.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 每页显示数量 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              每页:
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={pageSize}
              onChange={(e) => {
                const val = Math.max(1, Math.min(10000, Number(e.target.value) || 1));
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* 清除筛选 */}
          {(statusFilter !== 'all' || protocolFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setProtocolFilter('all');
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-200 cursor-pointer"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 代理表格 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={paginatedProxies.length > 0 && selectedProxyIds.length === paginatedProxies.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-green-500 focus:ring-green-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  协议
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  IP地址
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  端口
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  地区
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  响应时间
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedProxies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                        {proxies.length === 0 ? '暂无代理数据' : '没有符合筛选条件的代理'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                        {proxies.length === 0 ? '点击"添加"或"导入"按钮添加代理' : '尝试调整筛选条件'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProxies.map((proxy) => (
                  <tr key={proxy.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProxyIds.includes(proxy.id)}
                        onChange={() => toggleProxySelection(proxy.id)}
                        className="w-4 h-4 rounded text-green-500 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {proxy.protocol.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-mono">
                      {proxy.host}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-mono">
                      {proxy.port}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {proxy.region || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                          proxy.isValid
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {proxy.isValid ? '有效' : '无效'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {proxy.responseTime ? `${proxy.responseTime}ms` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              显示 {startIndex + 1} - {Math.min(endIndex, filteredProxies.length)} 条，共 {filteredProxies.length} 条
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* 页码 */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-green-500 text-white'
                          : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 添加代理模态框 */}
      <AddProxyModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  确认删除
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 dark:text-slate-300">
                确定要删除选中的 <span className="font-bold text-red-600 dark:text-red-400">{selectedProxyIds.length}</span> 条代理吗？
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                此操作不可恢复，请谨慎操作。
              </p>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 cursor-pointer font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
