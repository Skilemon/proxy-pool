import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/Dashboard.vue')
    },
    {
      path: '/proxies',
      name: 'Proxies',
      component: () => import('@/views/ProxyList.vue')
    },
    {
      path: '/sources',
      name: 'Sources',
      component: () => import('@/views/SourceList.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue')
    }
  ]
});

export default router;
