<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 w-full max-w-sm">
      <h1 class="text-2xl font-bold text-center text-slate-900 dark:text-white mb-8">ProxyPool</h1>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            autofocus
            class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const appStore = useAppStore();

const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  if (!password.value) {
    errorMsg.value = '请输入密码';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    const token = await api.login(password.value);
    appStore.setToken(token);
    router.push('/');
  } catch (error: any) {
    errorMsg.value = error.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>
