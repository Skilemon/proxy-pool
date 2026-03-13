<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">系统设置</h2>

      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            验证间隔（分钟）
          </label>
          <input
            v-model.number="localSettings.validationInterval"
            type="number"
            min="1"
            class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            获取间隔（分钟）
          </label>
          <input
            v-model.number="localSettings.fetchInterval"
            type="number"
            min="1"
            class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            验证超时（毫秒）
          </label>
          <input
            v-model.number="localSettings.validationTimeout"
            type="number"
            min="1000"
            class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            验证并发数
          </label>
          <input
            v-model.number="localSettings.validationConcurrency"
            type="number"
            min="1"
            max="50"
            class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            测试 URL
          </label>
          <input
            v-model="localSettings.testUrl"
            type="text"
            class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div class="flex items-center justify-between py-2">
          <div>
            <div class="text-sm font-medium text-slate-700 dark:text-slate-300">获取前清除无效代理</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">每次获取代理前，自动删除所有验证不通过的代理</div>
          </div>
          <button
            type="button"
            @click="localSettings.clearInvalidOnFetch = !localSettings.clearInvalidOnFetch"
            :class="localSettings.clearInvalidOnFetch ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'"
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
          >
            <span
              :class="localSettings.clearInvalidOnFetch ? 'translate-x-5' : 'translate-x-0'"
              class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200"
            />
          </button>
        </div>

        <div class="flex gap-4">
          <button
            @click="handleSave"
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            保存设置
          </button>
          <button
            @click="handleReset"
            class="px-6 py-3 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
          >
            重置
          </button>
        </div>
      </div>
    </div>

    <!-- 修改密码 -->
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">修改密码</h3>
      <div class="space-y-4 max-w-sm">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">旧密码</label>
          <input v-model="oldPassword" type="password" class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">新密码</label>
          <input v-model="newPassword" type="password" class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">确认新密码</label>
          <input v-model="confirmPassword" type="password" class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white" />
        </div>
        <button @click="handleChangePassword" class="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
          修改密码
        </button>
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">账号</h3>
      <button @click="handleLogout" class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
        退出登录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/api/client';
import type { AppSettings } from '@/types';

const router = useRouter();
const settingsStore = useSettingsStore();
const appStore = useAppStore();
const localSettings = ref<AppSettings>({
  validationInterval: 30,
  fetchInterval: 60,
  validationTimeout: 5000,
  validationConcurrency: 10,
  testUrl: '',
  clearInvalidOnFetch: false
});

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

async function loadSettings() {
  try {
    await settingsStore.fetchSettings();
    localSettings.value = { ...settingsStore.settings };
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleSave() {
  try {
    await settingsStore.updateSettings(localSettings.value);
    appStore.showToast('设置已保存，调度器将重启', 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleReset() {
  try {
    const defaults = await api.getDefaultSettings();
    localSettings.value = { ...defaults };
    appStore.showToast('已重置为默认值', 'info');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleChangePassword() {
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    appStore.showToast('请填写所有密码字段', 'error');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    appStore.showToast('两次输入的新密码不一致', 'error');
    return;
  }
  try {
    await api.changePassword(oldPassword.value, newPassword.value);
    appStore.showToast('密码已修改，请重新登录', 'success');
    appStore.clearToken();
    router.push('/login');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

function handleLogout() {
  appStore.clearToken();
  router.push('/login');
}

onMounted(() => {
  loadSettings();
});
</script>
