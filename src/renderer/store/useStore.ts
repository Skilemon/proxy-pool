import { create } from 'zustand';
import type { ProxyEntry, ProxySource, AppSettings } from '../../shared/types';

interface AppState {
  // 代理列表
  proxies: ProxyEntry[];
  setProxies: (proxies: ProxyEntry[]) => void;
  addProxy: (proxy: ProxyEntry) => void;
  removeProxies: (ids: string[]) => void;
  updateProxy: (id: string, updates: Partial<ProxyEntry>) => void;

  // 来源列表
  sources: ProxySource[];
  setSources: (sources: ProxySource[]) => void;
  addSource: (source: ProxySource) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, updates: Partial<ProxySource>) => void;

  // 应用设置
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;

  // UI状态
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  success: string | null;
  setSuccess: (success: string | null) => void;

  // 初始化状态
  isInitialized: boolean;
  setInitialized: (initialized: boolean) => void;

  // 选中的代理
  selectedProxyIds: string[];
  setSelectedProxyIds: (ids: string[]) => void;
  toggleProxySelection: (id: string) => void;
  clearSelection: () => void;
}

export const useStore = create<AppState>((set) => ({
  // 代理列表
  proxies: [],
  setProxies: (proxies) => set({ proxies }),
  addProxy: (proxy) => set((state) => ({ proxies: [...state.proxies, proxy] })),
  removeProxies: (ids) =>
    set((state) => ({
      proxies: state.proxies.filter((p) => !ids.includes(p.id)),
      selectedProxyIds: state.selectedProxyIds.filter((id) => !ids.includes(id)),
    })),
  updateProxy: (id, updates) =>
    set((state) => ({
      proxies: state.proxies.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  // 来源列表
  sources: [],
  setSources: (sources) => set({ sources }),
  addSource: (source) => set((state) => ({ sources: [...state.sources, source] })),
  removeSource: (id) =>
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
    })),
  updateSource: (id, updates) =>
    set((state) => ({
      sources: state.sources.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  // 应用设置
  settings: null,
  setSettings: (settings) => set({ settings }),

  // UI状态
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
  success: null,
  setSuccess: (success) => set({ success }),

  // 初始化状态
  isInitialized: false,
  setInitialized: (initialized) => set({ isInitialized: initialized }),

  // 选中的代理
  selectedProxyIds: [],
  setSelectedProxyIds: (ids) => set({ selectedProxyIds: ids }),
  toggleProxySelection: (id) =>
    set((state) => ({
      selectedProxyIds: state.selectedProxyIds.includes(id)
        ? state.selectedProxyIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedProxyIds, id],
    })),
  clearSelection: () => set({ selectedProxyIds: [] }),
}));
