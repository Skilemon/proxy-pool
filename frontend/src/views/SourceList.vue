<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">来源管理</h2>
        <div class="flex gap-2">
          <button @click="showAddForm = !showAddForm" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            添加来源
          </button>
          <button @click="handleFetchAll" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            全部获取
          </button>
        </div>
      </div>

      <div v-if="showAddForm" class="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">添加来源</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input v-model="newSource.name" placeholder="来源名称" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model="newSource.url" placeholder="来源 URL" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <button @click="handleAddSource" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">提交</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-700">
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">名称</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">URL</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">状态</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">最后获取</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="source in sourceStore.sources" :key="source.id" class="border-b border-slate-200 dark:border-slate-700">
              <td class="p-3 text-slate-900 dark:text-white">{{ source.name }}</td>
              <td class="p-3 text-slate-900 dark:text-white text-sm truncate max-w-xs">{{ source.url }}</td>
              <td class="p-3">
                <button
                  @click="toggleEnabled(source)"
                  class="px-2 py-1 rounded text-sm"
                  :class="source.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'"
                >
                  {{ source.enabled ? '启用' : '禁用' }}
                </button>
              </td>
              <td class="p-3 text-slate-900 dark:text-white">{{ source.lastFetched ? formatDate(source.lastFetched) : '从未' }}</td>
              <td class="p-3">
                <div class="flex gap-2">
                  <button
                    @click="handleFetchOne(source.id)"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    获取
                  </button>
                  <button
                    @click="handleDelete(source.id)"
                    :disabled="source.isDefault"
                    class="px-3 py-1 rounded text-sm text-white"
                    :class="source.isDefault ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="sourceStore.sources.length === 0" class="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无来源数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSourceStore } from '@/stores/sourceStore';
import { useAppStore } from '@/stores/appStore';
import type { ProxySource } from '@/types';

const sourceStore = useSourceStore();
const appStore = useAppStore();
const showAddForm = ref(false);
const newSource = ref({
  name: '',
  url: '',
  enabled: true
});

async function handleAddSource() {
  if (!newSource.value.name || !newSource.value.url) {
    appStore.showToast('请填写完整信息', 'error');
    return;
  }

  try {
    await sourceStore.addSource(newSource.value);
    appStore.showToast('添加成功', 'success');
    newSource.value = { name: '', url: '', enabled: true };
    showAddForm.value = false;
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function toggleEnabled(source: ProxySource) {
  try {
    await sourceStore.updateSource(source.id, { enabled: !source.enabled });
    appStore.showToast('更新成功', 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleFetchOne(id: string) {
  try {
    const result = await sourceStore.fetchFromSource(id);
    appStore.showToast(`获取成功: 添加 ${result.added} 个，跳过 ${result.duplicates} 个重复`, 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleFetchAll() {
  try {
    const result = await sourceStore.fetchFromAllSources();
    appStore.showToast(`获取完成: 从 ${result.total} 个来源添加 ${result.added} 个，跳过 ${result.duplicates} 个重复`, 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleDelete(id: string) {
  if (!confirm('确定要删除此来源吗？')) return;

  try {
    await sourceStore.deleteSource(id);
    appStore.showToast('删除成功', 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN');
}

onMounted(() => {
  sourceStore.fetchSources();
});
</script>
