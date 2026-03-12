import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ProxyEntry } from '@/types';
import { api } from '@/api/client';

export const useProxyStore = defineStore('proxy', () => {
  const proxies = ref<ProxyEntry[]>([]);
  const loading = ref(false);
  const selectedIds = ref<string[]>([]);

  async function fetchProxies() {
    loading.value = true;
    try {
      proxies.value = await api.getProxies();
    } finally {
      loading.value = false;
    }
  }

  async function addProxy(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>) {
    const newProxy = await api.addProxy(proxy);
    proxies.value.unshift(newProxy);
  }

  async function deleteProxies(ids: string[]) {
    await api.deleteProxies(ids);
    proxies.value = proxies.value.filter(p => !ids.includes(p.id));
    selectedIds.value = selectedIds.value.filter(id => !ids.includes(id));
  }

  async function importProxies(content: string) {
    const result = await api.importProxies(content);
    await fetchProxies();
    return result;
  }

  async function exportProxies(ids?: string[]) {
    const blob = await api.exportProxies(ids);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proxies.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function toggleSelection(id: string) {
    const index = selectedIds.value.indexOf(id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    } else {
      selectedIds.value.push(id);
    }
  }

  function selectAll() {
    selectedIds.value = proxies.value.map(p => p.id);
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  return {
    proxies,
    loading,
    selectedIds,
    fetchProxies,
    addProxy,
    deleteProxies,
    importProxies,
    exportProxies,
    toggleSelection,
    selectAll,
    clearSelection
  };
});
