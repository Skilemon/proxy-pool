import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true }
    },
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
    },
    {
      path: '/socks-accounts',
      name: 'SocksAccounts',
      component: () => import('@/views/SocksAccounts.vue')
    },
    {
      path: '/help',
      name: 'Help',
      component: () => import('@/views/Help.vue')
    }
  ]
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (!to.meta.public && !token) {
    return { name: 'Login' };
  }
  if (to.name === 'Login' && token) {
    return { name: 'Dashboard' };
  }
});

export default router;
