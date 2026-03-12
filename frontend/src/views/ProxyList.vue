<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">代理列表</h2>
        <div class="flex gap-2">
          <button @click="handleValidateNow" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
            立即验证
          </button>
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

      <div class="mb-4 flex flex-wrap gap-4 items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 dark:text-slate-400">协议:</label>
          <select v-model="protocolFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option value="all">全部</option>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 dark:text-slate-400">可用性:</label>
          <select v-model="statusFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option value="all">全部</option>
            <option value="valid">有效</option>
            <option value="invalid">无效</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 dark:text-slate-400">响应时间:</label>
          <select v-model="responseTimeFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option value="all">全部</option>
            <option value="500">500ms 以内</option>
            <option value="1000">1000ms 以内</option>
            <option value="2000">2000ms 以内</option>
            <option value="5000">5000ms 以内</option>
          </select>
        </div>
        <span class="ml-auto text-sm text-slate-500 dark:text-slate-400">
          共 {{ filteredProxies.length }} 条
        </span>
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
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="proxy in paginatedProxies" :key="proxy.id" class="border-b border-slate-200 dark:border-slate-700">
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
              <td class="p-3">
                <button
                  @click="copyProxy(proxy)"
                  class="px-3 py-1 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-500 text-sm"
                >复制</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filteredProxies.length === 0" class="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无代理数据
        </div>
      </div>

      <!-- 分页控件 -->
      <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>每页</span>
          <select v-model="pageSize" class="px-2 py-1 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <span>条</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="currentPage = 1"
            :disabled="currentPage === 1"
            class="px-2 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >«</button>
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >‹</button>
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="currentPage = page"
            class="px-3 py-1 rounded border text-sm"
            :class="page === currentPage
              ? 'bg-blue-500 text-white border-blue-500'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white'"
          >{{ page }}</button>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >›</button>
          <button
            @click="currentPage = totalPages"
            :disabled="currentPage === totalPages"
            class="px-2 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >»</button>
        </div>
        <span class="text-sm text-slate-600 dark:text-slate-400">
          第 {{ currentPage }} / {{ totalPages }} 页
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useProxyStore } from '@/stores/proxyStore';
import { api } from '@/api/client';
import { useAppStore } from '@/stores/appStore';

const proxyStore = useProxyStore();
const appStore = useAppStore();

const showAddForm = ref(false);
const showImportForm = ref(false);
const importContent = ref('');
const statusFilter = ref<'all' | 'valid' | 'invalid'>('all');
const protocolFilter = ref<'all' | 'http' | 'https' | 'socks4' | 'socks5'>('all');
const responseTimeFilter = ref<'all' | '500' | '1000' | '2000' | '5000'>('all');
const currentPage = ref(1);
const pageSize = ref(20);

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
  return proxyStore.proxies.filter(proxy => {
    if (protocolFilter.value !== 'all' && proxy.protocol !== protocolFilter.value) return false;
    if (statusFilter.value === 'valid' && !proxy.isValid) return false;
    if (statusFilter.value === 'invalid' && proxy.isValid) return false;
    if (responseTimeFilter.value !== 'all') {
      const limit = parseInt(responseTimeFilter.value);
      if (!proxy.responseTime || proxy.responseTime > limit) return false;
    }
    return true;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProxies.value.length / pageSize.value)));

const paginatedProxies = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredProxies.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const pages: number[] = [];
  const total = totalPages.value;
  const current = currentPage.value;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

// 筛选条件或每页条数变化时重置到第一页
watch([statusFilter, protocolFilter, responseTimeFilter, pageSize], () => {
  currentPage.value = 1;
});

const isAllSelected = computed(() => {
  return paginatedProxies.value.length > 0 &&
    paginatedProxies.value.every(proxy => proxyStore.selectedIds.includes(proxy.id));
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    const pageIds = paginatedProxies.value.map(p => p.id);
    pageIds.forEach(id => {
      if (proxyStore.selectedIds.includes(id)) proxyStore.toggleSelection(id);
    });
  } else {
    paginatedProxies.value.forEach(proxy => {
      if (!proxyStore.selectedIds.includes(proxy.id)) proxyStore.toggleSelection(proxy.id);
    });
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

async function handleValidateNow() {
  try {
    await api.validateProxies();
    appStore.showToast('已触发验证，请稍后刷新查看结果', 'success');
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
    // 删除后若当前页超出范围则回退
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
    }
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

function copyProxy(proxy: any) {
  let text = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
  if (proxy.username && proxy.password) {
    text = `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
  }
  navigator.clipboard.writeText(text).then(() => {
    appStore.showToast('已复制到剪贴板', 'success');
  }).catch(() => {
    appStore.showToast('复制失败', 'error');
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN');
}

onMounted(() => {
  proxyStore.fetchProxies();
});
</script>
