<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">代理列表</h2>
        <div class="flex gap-2">
          <button @click="showAddForm = !showAddForm" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            添加代理
          </button>
          <button @click="showImportForm = !showImportForm" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            导入代理
          </button>
          <button @click="handleExport" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
            导出选中
          </button>
          <button @click="handleDeleteSelected" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            删除选中
          </button>
        </div>
      </div>

      <div v-if="showAddForm" class="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">添加代理</h3>
        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select v-model="newProxy.protocol" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
          <input v-model="newProxy.host" placeholder="主机/IP" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model.number="newProxy.port" type="number" placeholder="端口" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model="newProxy.username" placeholder="用户名(可选)" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model="newProxy.password" placeholder="密码(可选)" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <button @click="handleAddProxy" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">提交</button>
        </div>
      </div>

      <div v-if="showImportForm" class="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">批量导入</h3>
        <textarea
          v-model="importContent"
          rows="6"
          placeholder="每行一个代理，格式: http://ip:port 或 socks5://user:pass@ip:port"
          class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white"
        />
        <div class="mt-3 flex gap-2">
          <button @click="handleImport" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">开始导入</button>
          <button @click="showImportForm = false" class="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600">取消</button>
        </div>
      </div>

      <div class="mb-4 flex gap-4 items-center">
        <label class="text-sm text-slate-600 dark:text-slate-400">状态筛选:</label>
        <select v-model="statusFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
          <option value="all">全部</option>
          <option value="valid">有效</option>
          <option value="invalid">无效</option>
        </select>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-700">
              <th class="p-3 text-left">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">协议</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">主机</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">端口</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">状态</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">响应时间</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="proxy in filteredProxies" :key="proxy.id" class="border-b border-slate-200 dark:border-slate-700">
              <td class="p-3">
                <input
                  type="checkbox"
                  :checked="proxyStore.selectedIds.includes(proxy.id)"
                  @change="proxyStore.toggleSelection(proxy.id)"
                />
              </td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.protocol.toUpperCase() }}</td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.host }}</td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.port }}</td>
              <td class="p-3">
                <span
                  class="px-2 py-1 rounded text-sm"
                  :class="proxy.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                >
                  {{ proxy.isValid ? '有效' : '无效' }}
                </span>
              </td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.responseTime ? `${proxy.responseTime}ms` : '-' }}</td>
              <td class="p-3 text-slate-900 dark:text-white">{{ formatDate(proxy.createdAt) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="filteredProxies.length === 0" class="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无代理数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useProxyStore } from '@/stores/proxyStore';
import { useAppStore } from '@/stores/appStore';

const proxyStore = useProxyStore();
const appStore = useAppStore();

const showAddForm = ref(false);
const showImportForm = ref(false);
const importContent = ref('');
const statusFilter = ref<'all' | 'valid' | 'invalid'>('all');

const newProxy = ref({
  protocol: 'http' as 'http' | 'https' | 'socks4' | 'socks5',
  host: '',
  port: 8080,
  username: '',
  password: '',
  country: '',
  isValid: false
});

const filteredProxies = computed(() => {
  if (statusFilter.value === 'all') return proxyStore.proxies;
  return proxyStore.proxies.filter(proxy =>
    statusFilter.value === 'valid' ? proxy.isValid : !proxy.isValid
  );
});

const isAllSelected = computed(() => {
  return filteredProxies.value.length > 0 &&
    filteredProxies.value.every(proxy => proxyStore.selectedIds.includes(proxy.id));
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    proxyStore.clearSelection();
  } else {
    proxyStore.selectAll();
  }
}

async function handleAddProxy() {
  try {
    await proxyStore.addProxy({
      ...newProxy.value,
      username: newProxy.value.username || undefined,
      password: newProxy.value.password || undefined,
      country: newProxy.value.country || undefined
    });

    appStore.showToast('代理添加成功', 'success');
    showAddForm.value = false;
    newProxy.value = {
      protocol: 'http',
      host: '',
      port: 8080,
      username: '',
      password: '',
      country: '',
      isValid: false
    };
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleImport() {
  if (!importContent.value.trim()) {
    appStore.showToast('请输入导入内容', 'error');
    return;
  }

  try {
    const result = await proxyStore.importProxies(importContent.value);
    appStore.showToast(`导入成功: 新增 ${result.added} 条，重复 ${result.duplicates} 条`, 'success');
    importContent.value = '';
    showImportForm.value = false;
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleExport() {
  try {
    await proxyStore.exportProxies(proxyStore.selectedIds.length > 0 ? proxyStore.selectedIds : undefined);
    appStore.showToast('导出成功', 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleDeleteSelected() {
  if (proxyStore.selectedIds.length === 0) {
    appStore.showToast('请先选择要删除的代理', 'error');
    return;
  }

  if (!confirm(`确定删除 ${proxyStore.selectedIds.length} 条代理吗？`)) {
    return;
  }

  try {
    await proxyStore.deleteProxies(proxyStore.selectedIds);
    appStore.showToast('删除成功', 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN');
}

onMounted(() => {
  proxyStore.fetchProxies();
});
</script>
