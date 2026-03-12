<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-900">
    <header class="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">ProxyPool</h1>
          <button
            @click="appStore.toggleDarkMode"
            class="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
          >
            {{ appStore.darkMode ? '浅色' : '深色' }}
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <nav class="mb-6 flex gap-2 flex-wrap">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="$route.path === item.path
            ? 'bg-blue-500 text-white'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <main>
        <slot />
      </main>
    </div>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import Toast from './Toast.vue';

const appStore = useAppStore();

const navItems = [
  { path: '/dashboard', label: '仪表盘' },
  { path: '/proxies', label: '代理列表' },
  { path: '/sources', label: '来源管理' },
  { path: '/settings', label: '系统设置' }
];
</script>
