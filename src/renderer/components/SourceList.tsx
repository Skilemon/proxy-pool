import { useState } from 'react';
import { useStore } from '../store/useStore';
import { electronAPI } from '../api/electron';

export default function SourceList() {
  const { sources, setError, setSuccess, setLoading } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    format: 'json' as 'json' | 'text',
    enabled: true,
    refreshInterval: 60,
    priority: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingSource) {
        await electronAPI.source.update(editingSource.id, formData);
        setSuccess('来源更新成功！');
      } else {
        await electronAPI.source.add(formData);
        setSuccess('来源添加成功！');
      }

      const updatedSources = await electronAPI.source.getAll();
      useStore.setState({ sources: updatedSources });

      setFormData({ name: '', url: '', format: 'json', enabled: true, refreshInterval: 60, priority: 5 });
      setEditingSource(null);
      setShowAddModal(false);
    } catch (error: any) {
      setError(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (source: any) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      format: source.format,
      enabled: source.enabled,
      refreshInterval: source.refreshInterval,
      priority: source.priority,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个代理来源吗？')) return;

    setLoading(true);
    try {
      await electronAPI.source.delete(id);
      setSuccess('来源删除成功！');
      const updatedSources = await electronAPI.source.getAll();
      useStore.setState({ sources: updatedSources });
    } catch (error: any) {
      setError(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async (id: string) => {
    setLoading(true);
    try {
      const result = await electronAPI.source.fetch(id);
      setSuccess(`成功获取 ${result.count} 条代理`);
      // 代理列表由主进程通过 proxy:updated IPC 事件推送更新，无需手动拉取
    } catch (error: any) {
      setError(error.message || '获取失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (source: any) => {
    setLoading(true);
    try {
      await electronAPI.source.update(source.id, { enabled: !source.enabled });
      const updatedSources = await electronAPI.source.getAll();
      useStore.setState({ sources: updatedSources });
    } catch (error: any) {
      setError(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
            代理来源
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            管理代理来源，自动获取和更新代理列表（共 {sources.length} 个来源）
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingSource(null);
            setFormData({ name: '', url: '', format: 'json', enabled: true, refreshInterval: 60, priority: 5 });
            setShowAddModal(true);
          }}
          className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium shadow-lg hover:bg-green-600 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>添加来源</span>
          </div>
        </button>
      </div>

      {/* 来源列表 */}
      <div className="grid gap-6">
        {sources.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              暂无代理来源
            </p>
            <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
              点击"添加来源"按钮开始添加代理来源
            </p>
          </div>
        ) : (
          sources.map((source) => (
            <div key={source.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-200">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {source.name}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                          source.enabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {source.enabled ? '已启用' : '已禁用'}
                      </span>
                      <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {source.format.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 break-all font-mono bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg">
                      {source.url}
                    </p>
                    {source.lastFetch && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-500 flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>最后获取: {new Date(source.lastFetch).toLocaleString('zh-CN')}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 ml-4">
                    <button
                      onClick={() => handleFetch(source.id)}
                      className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!source.enabled}
                      title={!source.enabled ? '请先启用此来源' : '获取代理'}
                    >
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>获取</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleToggleEnabled(source)}
                      className={`px-4 py-2 text-white text-sm rounded-lg transition-colors duration-200 cursor-pointer ${
                        source.enabled 
                          ? 'bg-yellow-500 hover:bg-yellow-600' 
                          : 'bg-slate-500 hover:bg-slate-600'
                      }`}
                    >
                      {source.enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleEdit(source)}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>编辑</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>删除</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加/编辑来源模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingSource ? '编辑来源' : '添加来源'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如: 皮卡丘代理"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com/proxies.json"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    格式
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                  >
                    <option value="json">JSON</option>
                    <option value="text">纯文本（每行一条）</option>
                  </select>
                </div>

                <div className="flex items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-5 h-5 rounded text-green-500 focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor="enabled" className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    启用此来源
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSource(null);
                  }}
                  className="px-6 py-3 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 cursor-pointer font-medium"
                >
                  {editingSource ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
