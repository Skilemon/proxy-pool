<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">SOCKS5 账户管理</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            SOCKS5 端口：<span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{ socksPort }}</span>
          </p>
        </div>
        <button @click="showForm = !showForm" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          添加账户
        </button>
      </div>

      <!-- 新增表单 -->
      <div v-if="showForm" class="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">新建账户</h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input v-model="form.username" placeholder="用户名" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model="form.password" placeholder="密码" type="password" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <select v-model="form.mode" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option value="rotate">每次请求换代理</option>
            <option value="sticky">代理失效后换</option>
          </select>
          <select v-model="form.maxDelay" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option :value="undefined">不限延迟</option>
            <option :value="500">500ms 以内</option>
            <option :value="1000">1000ms 以内</option>
            <option :value="2000">2000ms 以内</option>
            <option :value="3000">3000ms 以内</option>
          </select>
          <button @click="handleCreate" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">提交</button>
        </div>
      </div>

      <!-- 账户列表 -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-700">
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">用户名</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">密码</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">代理模式</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">延迟要求</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">状态</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">创建时间</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="acc in accounts" :key="acc.id" class="border-b border-slate-200 dark:border-slate-700">
              <td class="p-3 font-mono text-slate-900 dark:text-white">{{ acc.username }}</td>
              <td class="p-3">
                <span v-if="visiblePasswords.has(acc.id)" class="font-mono text-slate-900 dark:text-white">{{ acc.password }}</span>
                <span v-else class="font-mono text-slate-400">••••••••</span>
                <button @click="togglePassword(acc.id)" class="ml-2 text-xs text-blue-500 hover:underline">
                  {{ visiblePasswords.has(acc.id) ? '隐藏' : '显示' }}
                </button>
              </td>
              <td class="p-3">
                <select
                  :value="acc.mode"
                  @change="handleModeChange(acc, ($event.target as HTMLSelectElement).value as 'rotate' | 'sticky')"
                  class="px-2 py-1 border rounded text-sm bg-white dark:bg-slate-600 dark:text-white"
                >
                  <option value="rotate">每次换代理</option>
                  <option value="sticky">失效后换</option>
                </select>
              </td>
              <td class="p-3">
                <select
                  :value="acc.maxDelay ?? ''"
                  @change="handleMaxDelayChange(acc, ($event.target as HTMLSelectElement).value)"
                  class="px-2 py-1 border rounded text-sm bg-white dark:bg-slate-600 dark:text-white"
                >
                  <option value="">不限</option>
                  <option value="500">500ms</option>
                  <option value="1000">1000ms</option>
                  <option value="2000">2000ms</option>
                  <option value="3000">3000ms</option>
                </select>
              </td>
              <td class="p-3">
                <button
     @click="handleToggleEnabled(acc)"
                  class="px-2 py-1 rounded text-sm"
                  :class="acc.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'"
                >
                  {{ acc.enabled ? '启用' : '禁用' }}
                </button>
              </td>
              <td class="p-3 text-slate-500 dark:text-slate-400 text-sm">{{ formatDate(acc.createdAt) }}</td>
              <td class="p-3">
                <button @click="handleDelete(acc.id)" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">删除</button>
              </td>
            </tr>
            <tr v-if="accounts.length === 0">
              <td colspan="7" class="p-6 text-center text-slate-400">暂无账户，请点击「添加账户」创建</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/appStore';

interface SocksAccount {
  id: string;
  username: string;
  password: string;
  mode: 'rotate' | 'sticky';
  enabled: boolean;
  maxDelay?: number;
  createdAt: string;
}

const appStore = useAppStore();
const accounts = ref<SocksAccount[]>([]);
const showForm = ref(false);
const visiblePasswords = ref(new Set<string>());
const form = ref({ username: '', password: '', mode: 'rotate' as 'rotate' | 'sticky', maxDelay: undefined as number | undefined });

const socksPort = import.meta.env.VITE_SOCKS_PORT || '1080';

async function fetchAccounts() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/socks-accounts', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) accounts.value = data.data;
  } catch {
    appStore.showToast('加载账户失败', 'error');
  }
}

async function handleCreate() {
  if (!form.value.username || !form.value.password) {
    appStore.showToast('用户名和密码不能为空', 'error'); return;
  }
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/socks-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form.value)
    });
    const data = await res.json();
    if (data.success) {
      accounts.value.unshift(data.data);
      form.value = { username: '', password: '', mode: 'rotate' };
      showForm.value = false;
      appStore.showToast('账户创建成功', 'success');
    } else {
      appStore.showToast(data.error || '创建失败', 'error');
    }
  } catch {
    appStore.showToast('创建失败', 'error');
  }
}

async function handleModeChange(acc: SocksAccount, mode: 'rotate' | 'sticky') {
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode })
    });
    acc.mode = mode;
    appStore.showToast('模式已更新', 'success');
  } catch {
    appStore.showToast('更新失败', 'error');
  }
}

async function handleMaxDelayChange(acc: SocksAccount, value: string) {
  const maxDelay = value === '' ? undefined : Number(value);
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ maxDelay: value === '' ? null : Number(value) })
    });
    acc.maxDelay = maxDelay;
    appStore.showToast('延迟要求已更新', 'success');
  } catch {
    appStore.showToast('更新失败', 'error');
  }
}

async function handleToggleEnabled(acc: SocksAccount) {
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: !acc.enabled })
    });
    acc.enabled = !acc.enabled;
  } catch {
    appStore.showToast('更新失败', 'error');
  }
}

async function handleDelete(id: string) {
  if (!confirm('确认删除该账户？')) return;
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    accounts.value = accounts.value.filter(a => a.id !== id);
    appStore.showToast('删除成功', 'success');
  } catch {
    appStore.showToast('删除失败', 'error');
  }
}

function togglePassword(id: string) {
  if (visiblePasswords.value.has(id)) {
    visiblePasswords.value.delete(id);
  } else {
    visiblePasswords.value.add(id);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN');
}

onMounted(fetchAccounts);
</script>
