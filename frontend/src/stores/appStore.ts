import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const darkMode = ref(false);
  const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));

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

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  }

  function clearToken() {
    token.value = null;
    localStorage.removeItem('token');
  }

  function isLoggedIn() {
    return !!token.value;
  }

  return {
    darkMode,
    toast,
    token,
    toggleDarkMode,
    showToast,
    setToken,
    clearToken,
    isLoggedIn
  };
});
