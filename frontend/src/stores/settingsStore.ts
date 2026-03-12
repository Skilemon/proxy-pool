import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AppSettings } from '@/types';
import { api } from '@/api/client';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    validationInterval: 30,
    fetchInterval: 60,
    validationTimeout: 5000,
    validationConcurrency: 10,
    testUrl: ''
  });

  async function fetchSettings() {
    settings.value = await api.getSettings();
  }

  async function updateSettings(updates: Partial<AppSettings>) {
    await api.updateSettings(updates);
    settings.value = { ...settings.value, ...updates };
  }

  return {
    settings,
    fetchSettings,
    updateSettings
  };
});
