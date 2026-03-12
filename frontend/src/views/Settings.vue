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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import type { AppSettings } from '@/types';

const settingsStore = useSettingsStore();
const appStore = useAppStore();
const localSettings = ref<AppSettings>({
  validationInterval: 30,
  fetchInterval: 60,
  validationTimeout: 5000,
  validationConcurrency: 10,
  testUrl: ''
});

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

function handleReset() {
  localSettings.value = { ...settingsStore.settings };
  appStore.showToast('已重置', 'info');
}

onMounted(() => {
  loadSettings();
});
</script>
