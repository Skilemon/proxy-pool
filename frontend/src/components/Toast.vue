<template>
  <div v-if="toast" class="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white" :class="toastClass">
    {{ toast.message }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores/appStore';

const appStore = useAppStore();
const toast = computed(() => appStore.toast);

const toastClass = computed(() => {
  if (!toast.value) return 'bg-blue-500';

  switch (toast.value.type) {
    case 'success':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
});
</script>
