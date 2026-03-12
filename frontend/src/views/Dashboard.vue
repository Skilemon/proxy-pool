<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">统计概览</h2>

      <div v-if="loading" class="text-center py-8 text-slate-500">加载中...</div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <div class="text-sm text-blue-600 dark:text-blue-400 mb-2">总代理数</div>
          <div class="text-3xl font-bold text-blue-700 dark:text-blue-300">{{ stats.total }}</div>
        </div>

        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <div class="text-sm text-green-600 dark:text-green-400 mb-2">有效代理</div>
          <div class="text-3xl font-bold text-green-700 dark:text-green-300">{{ stats.valid }}</div>
        </div>

        <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
          <div class="text-sm text-red-600 dark:text-red-400 mb-2">无效代理</div>
          <div class="text-3xl font-bold text-red-700 dark:text-red-300">{{ stats.invalid }}</div>
        </div>
      </div>

      <div v-if="!loading && Object.keys(stats.byProtocol).length > 0" class="mt-6">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">按协议分类</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="(protocolStats, protocol) in stats.byProtocol" :key="protocol" class="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{{ (protocol as string).toUpperCase() }}</div>
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <span class="text-xs text-slate-500 dark:text-slate-400">总代理数</span>
                <span class="text-sm font-bold text-slate-900 dark:text-white">{{ protocolStats.total }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-green-600 dark:text-green-400">有效代理</span>
                <span class="text-sm font-bold text-green-700 dark:text-green-300">{{ protocolStats.valid }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-red-500 dark:text-red-400">无效代理</span>
                <span class="text-sm font-bold text-red-600 dark:text-red-400">{{ protocolStats.invalid }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">快速操作</h2>
      <div class="flex gap-4 flex-wrap">
        <button
          @click="handleValidate"
          :disabled="validating"
          class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ validating ? '验证中...' : '立即验证' }}
        </button>
        <button
          @click="handleFetch"
          :disabled="fetching"
          class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ fetching ? '获取中...' : '立即获取' }}
        </button>
        <button
          @click="refreshStats"
          class="px-6 py-3 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
        >
          刷新统计
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import { useAppStore } from '@/stores/appStore';
import type { StatsData } from '@/types';

const appStore = useAppStore();
const loading = ref(false);
const validating = ref(false);
const fetching = ref(false);
const stats = ref<StatsData>({
  total: 0,
  valid: 0,
  invalid: 0,
  byProtocol: {}
});

async function refreshStats() {
  loading.value = true;
  try {
    stats.value = await api.getStats();
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

async function handleValidate() {
  validating.value = true;
  try {
    await api.validateProxies();
    appStore.showToast('验证任务已启动', 'success');
    setTimeout(refreshStats, 2000);
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  } finally {
    validating.value = false;
  }
}

async function handleFetch() {
  fetching.value = true;
  try {
    await api.fetchProxies();
    appStore.showToast('获取任务已启动', 'success');
    setTimeout(refreshStats, 2000);
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  } finally {
    fetching.value = false;
  }
}

onMounted(() => {
  refreshStats();
});
</script>
