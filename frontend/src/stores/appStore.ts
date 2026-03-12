import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const darkMode = ref(false);
  const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  function toggleDarkMode() {
    darkMode.value = !darkMode.value;
    if (darkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    toast.value = { message, type };
    setTimeout(() => {
      toast.value = null;
    }, 3000);
  }

  return {
    darkMode,
    toast,
    toggleDarkMode,
    showToast
  };
});
