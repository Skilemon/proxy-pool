<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">统计概览</h2>
        <div class="flex gap-2">
          <button
            @click="refreshStats"
            :disabled="loading"
            class="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? '刷新中...' : '刷新统计' }}
          </button>
          <button
            @click="showConfirm = true"
            :disabled="loading || clearing"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ clearing ? '清除中...' : '清除无效' }}
          </button>
        </div>

        <!-- 二次确认弹窗 -->
        <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">确认清除无效代理</h3>
            <p class="text-slate-600 dark:text-slate-400 mb-6">此操作将删除所有无效代理，且不可恢复，是否继续？</p>
            <div class="flex justify-end gap-3">
              <button
                @click="showConfirm = false"
                class="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                取消
              </button>
              <button
                @click="clearInvalid"
                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import { useAppStore } from '@/stores/appStore';
import type { StatsData } from '@/types';

const appStore = useAppStore();
const loading = ref(false);
const clearing = ref(false);
const showConfirm = ref(false);
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


async function clearInvalid() {
  showConfirm.value = false;
  clearing.value = true;
  try {
    const result = await api.deleteInvalidProxies();
    appStore.showToast(`已清除 ${result.count} 个无效代理`, 'success');
    await refreshStats();
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  } finally {
    clearing.value = false;
  }
}

onMounted(() => {
  refreshStats();
});
</script>
