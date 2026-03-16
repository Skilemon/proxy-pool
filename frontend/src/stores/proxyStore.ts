import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { ProxyEntry } from '@/types';
import { api } from '@/api/client';

export const useProxyStore = defineStore('proxy', () => {
  const proxies = ref<ProxyEntry[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const selectedIds = ref<string[]>([]);

  // 分页与筛选参数
  const currentPage = ref(1);
  const pageSize = ref(20);
  const protocolFilter = ref('all');
  const statusFilter = ref('all');
  const responseTimeFilter = ref('all');
  const countryFilter = ref('all');
  const availableCountries = ref<string[]>([]);

  async function fetchCountries() {
    availableCountries.value = await api.getProxyCountries();
  }

  async function fetchProxies() {
    loading.value = true;
    try {
      const maxResponseTime = responseTimeFilter.value !== 'all' ? parseInt(responseTimeFilter.value) : undefined;
      const result = await api.getProxies({
        page: currentPage.value,
        pageSize: pageSize.value,
        protocol: protocolFilter.value,
        status: statusFilter.value,
        maxResponseTime,
        country: countryFilter.value
      });
      proxies.value = result.data;
      total.value = result.total;
    } finally {
      loading.value = false;
    }
  }

  async function addProxy(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>) {
    await api.addProxy(proxy);
    await fetchProxies();
  }

  async function deleteProxies(ids: string[]) {
    await api.deleteProxies(ids);
    selectedIds.value = selectedIds.value.filter(id => !ids.includes(id));
    await fetchProxies();
  }

  async function importProxies(content: string) {
    const result = await api.importProxies(content);
    currentPage.value = 1;
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

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

  const visiblePages = computed(() => {
    const pages: number[] = [];
    const total_ = totalPages.value;
    const current = currentPage.value;
    let start = Math.max(1, current - 2);
    let end = Math.min(total_, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  // 筛选条件或每页条数变化时重置到第一页并重新拉取
  watch([statusFilter, protocolFilter, responseTimeFilter, countryFilter, pageSize], () => {
    currentPage.value = 1;
    fetchProxies();
  });

  // 翻页时重新拉取
  watch(currentPage, () => {
    fetchProxies();
  });

  return {
    proxies,
    total,
    loading,
    selectedIds,
    currentPage,
    pageSize,
    protocolFilter,
    statusFilter,
    responseTimeFilter,
    countryFilter,
    availableCountries,
    totalPages,
    visiblePages,
    fetchProxies,
    fetchCountries,
    addProxy,
    deleteProxies,
    importProxies,
    exportProxies,
    toggleSelection,
    selectAll,
    clearSelection
  };
});
