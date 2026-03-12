import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ProxySource } from '@/types';
import { api } from '@/api/client';

export const useSourceStore = defineStore('source', () => {
  const sources = ref<ProxySource[]>([]);
  const loading = ref(false);

  async function fetchSources() {
    loading.value = true;
    try {
      sources.value = await api.getSources();
    } finally {
      loading.value = false;
    }
  }

  async function addSource(source: Omit<ProxySource, 'id' | 'createdAt'>) {
    const newSource = await api.addSource(source);
    sources.value.unshift(newSource);
  }

  async function updateSource(id: string, updates: Partial<Omit<ProxySource, 'id' | 'createdAt'>>) {
    await api.updateSource(id, updates);
    const index = sources.value.findIndex(s => s.id === id);
    if (index > -1) {
      sources.value[index] = { ...sources.value[index], ...updates };
    }
  }

  async function deleteSource(id: string) {
    await api.deleteSource(id);
    sources.value = sources.value.filter(s => s.id !== id);
  }

  async function fetchFromSource(id: string) {
    return await api.fetchFromSource(id);
  }

  async function fetchFromAllSources() {
    return await api.fetchFromAllSources();
  }

  return {
    sources,
    loading,
    fetchSources,
    addSource,
    updateSource,
    deleteSource,
    fetchFromSource,
    fetchFromAllSources
  };
});
