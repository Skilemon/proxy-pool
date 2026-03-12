<template>
  <template v-if="$route.name === 'Login'">
    <router-view />
    <Toast />
  </template>
  <Layout v-else>
    <router-view />
  </Layout>
</template>

<script setup lang="ts">
import Layout from '@/components/Layout.vue';
import Toast from '@/components/Toast.vue';
</script>
