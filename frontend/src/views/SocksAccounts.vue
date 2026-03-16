<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">SOCKS5 账户管理</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            SOCKS5 端口：<span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{ socksPort }}</span>
          </p>
        </div>
        <button @click="showForm = !showForm" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          添加账户
        </button>
      </div>

      <!-- 新增表单 -->
      <div v-if="showForm" class="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">新建账户</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <input v-model="form.username" placeholder="用户名" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model="form.password" placeholder="密码" type="password" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <select v-model="form.mode" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option value="rotate">每次请求换代理</option>
            <option value="sticky">代理失效后换</option>
          </select>
          <select v-model="form.maxDelay" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option :value="undefined">不限延迟</option>
            <option :value="500">500ms 以内</option>
            <option :value="1000">1000ms 以内</option>
            <option :value="2000">2000ms 以内</option>
            <option :value="3000">3000ms 以内</option>
          </select>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select v-model="form.countryFilterMode" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option value="include">国家 =（只用）</option>
            <option value="exclude">国家 ≠（排除）</option>
          </select>
          <select
            v-model="form.countryFilter"
            class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white md:col-span-2"
          >
            <option value="">不限国家</option>
            <option v-for="(name, code) in countryCodeMap" :key="code" :value="code">{{ name }}（{{ code }}）</option>
          </select>
          <button @click="handleCreate" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">提交</button>
        </div>
      </div>

      <!-- 账户列表 -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-700">
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">用户名</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">密码</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">代理模式</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">延迟要求</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">国家筛选</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">状态</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">创建时间</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="acc in accounts" :key="acc.id" class="border-b border-slate-200 dark:border-slate-700">
              <td class="p-3 font-mono text-slate-900 dark:text-white">{{ acc.username }}</td>
              <td class="p-3">
                <span v-if="visiblePasswords.has(acc.id)" class="font-mono text-slate-900 dark:text-white">{{ acc.password }}</span>
                <span v-else class="font-mono text-slate-400">••••••••</span>
                <button @click="togglePassword(acc.id)" class="ml-2 text-xs text-blue-500 hover:underline">
                  {{ visiblePasswords.has(acc.id) ? '隐藏' : '显示' }}
                </button>
              </td>
              <td class="p-3">
                <select
                  :value="acc.mode"
                  @change="handleModeChange(acc, ($event.target as HTMLSelectElement).value as 'rotate' | 'sticky')"
                  class="px-2 py-1 border rounded text-sm bg-white dark:bg-slate-600 dark:text-white"
                >
                  <option value="rotate">每次换代理</option>
                  <option value="sticky">失效后换</option>
                </select>
              </td>
              <td class="p-3">
                <select
                  :value="acc.maxDelay ?? ''"
                  @change="handleMaxDelayChange(acc, ($event.target as HTMLSelectElement).value)"
                  class="px-2 py-1 border rounded text-sm bg-white dark:bg-slate-600 dark:text-white"
                >
                  <option value="">不限</option>
                  <option value="500">500ms</option>
                  <option value="1000">1000ms</option>
                  <option value="2000">2000ms</option>
                  <option value="3000">3000ms</option>
                </select>
              </td>
              <td class="p-3">
                <div class="flex items-center gap-1">
                  <select
                    :value="acc.countryFilterMode ?? 'include'"
                    @change="handleCountryFilterChange(acc, acc.countryFilter ?? '', ($event.target as HTMLSelectElement).value as 'include' | 'exclude')"
                    class="px-2 py-1 border rounded text-xs bg-white dark:bg-slate-600 dark:text-white"
                  >
                    <option value="include">只用</option>
                    <option value="exclude">排除</option>
                  </select>
                  <select
                    :value="acc.countryFilter ?? ''"
                    @change="handleCountryFilterChange(acc, ($event.target as HTMLSelectElement).value, acc.countryFilterMode ?? 'include')"
                    class="px-2 py-1 border rounded text-xs bg-white dark:bg-slate-600 dark:text-white w-28"
                  >
                    <option value="">不限</option>
                    <option v-for="(name, code) in countryCodeMap" :key="code" :value="code">{{ name }}（{{ code }}）</option>
                  </select>
                </div>
              </td>
              <td class="p-3">
                <button
     @click="handleToggleEnabled(acc)"
                  class="px-2 py-1 rounded text-sm"
                  :class="acc.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'"
                >
                  {{ acc.enabled ? '启用' : '禁用' }}
                </button>
              </td>
              <td class="p-3 text-slate-500 dark:text-slate-400 text-sm">{{ formatDate(acc.createdAt) }}</td>
              <td class="p-3">
                <button @click="handleDelete(acc.id)" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">删除</button>
              </td>
            </tr>
            <tr v-if="accounts.length === 0">
              <td colspan="8" class="p-6 text-center text-slate-400">暂无账户，请点击「添加账户」创建</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/appStore';

interface SocksAccount {
  id: string;
  username: string;
  password: string;
  mode: 'rotate' | 'sticky';
  enabled: boolean;
  maxDelay?: number;
  countryFilter?: string;
  countryFilterMode?: 'include' | 'exclude';
  createdAt: string;
}

const appStore = useAppStore();
const accounts = ref<SocksAccount[]>([]);
const showForm = ref(false);
const visiblePasswords = ref(new Set<string>());
const form = ref({ username: '', password: '', mode: 'rotate' as 'rotate' | 'sticky', maxDelay: undefined as number | undefined, countryFilter: '', countryFilterMode: 'include' as 'include' | 'exclude' });

const countryCodeMap: Record<string, string> = {
  AD: '安道尔', AE: '阿联酋', AF: '阿富汗', AG: '安提瓜和巴布达', AL: '阿尔巴尼亚',
  AM: '亚美尼亚', AO: '安哥拉', AR: '阿根廷', AT: '奥地利', AU: '澳大利亚',
  AZ: '阿塞拜疆', BA: '波黑', BB: '巴巴多斯', BD: '孟加拉国', BE: '比利时',
  BF: '布基纳法索', BG: '保加利亚', BH: '巴林', BI: '布隆迪', BJ: '贝宁',
  BN: '文莱', BO: '玻利维亚', BR: '巴西', BS: '巴哈马', BT: '不丹',
  BW: '博茨瓦纳', BY: '白俄罗斯', BZ: '伯利兹', CA: '加拿大', CD: '刚果（金）',
  CF: '中非', CG: '刚果（布）', CH: '瑞士', CI: '科特迪瓦', CL: '智利',
  CM: '喀麦隆', CN: '中国', CO: '哥伦比亚', CR: '哥斯达黎加', CU: '古巴',
  CV: '佛得角', CY: '塞浦路斯', CZ: '捷克', DE: '德国', DJ: '吉布提',
  DK: '丹麦', DM: '多米尼克', DO: '多米尼加', DZ: '阿尔及利亚', EC: '厄瓜多尔',
  EE: '爱沙尼亚', EG: '埃及', ER: '厄立特里亚', ES: '西班牙', ET: '埃塞俄比亚',
  FI: '芬兰', FJ: '斐济', FR: '法国', GA: '加蓬', GB: '英国',
  GD: '格林纳达', GE: '格鲁吉亚', GH: '加纳', GM: '冈比亚', GN: '几内亚',
  GQ: '赤道几内亚', GR: '希腊', GT: '危地马拉', GW: '几内亚比绍', GY: '圭亚那',
  HN: '洪都拉斯', HR: '克罗地亚', HT: '海地', HU: '匈牙利', ID: '印度尼西亚',
  IE: '爱尔兰', IL: '以色列', IN: '印度', IQ: '伊拉克', IR: '伊朗',
  IS: '冰岛', IT: '意大利', JM: '牙买加', JO: '约旦', JP: '日本',
  KE: '肯尼亚', KG: '吉尔吉斯斯坦', KH: '柬埔寨', KI: '基里巴斯', KM: '科摩罗',
  KN: '圣基茨和尼维斯', KP: '朝鲜', KR: '韩国', KW: '科威特', KZ: '哈萨克斯坦',
  LA: '老挝', LB: '黎巴嫩', LC: '圣卢西亚', LI: '列支敦士登', LK: '斯里兰卡',
  LR: '利比里亚', LS: '莱索托', LT: '立陶宛', LU: '卢森堡', LV: '拉脱维亚',
  LY: '利比亚', MA: '摩洛哥', MC: '摩纳哥', MD: '摩尔多瓦', ME: '黑山',
  MG: '马达加斯加', MH: '马绍尔群岛', MK: '北马其顿', ML: '马里', MM: '缅甸',
  MN: '蒙古', MR: '毛里塔尼亚', MT: '马耳他', MU: '毛里求斯', MV: '马尔代夫',
  MW: '马拉维', MX: '墨西哥', MY: '马来西亚', MZ: '莫桑比克', NA: '纳米比亚',
  NE: '尼日尔', NG: '尼日利亚', NI: '尼加拉瓜', NL: '荷兰', NO: '挪威',
  NP: '尼泊尔', NR: '瑙鲁', NZ: '新西兰', OM: '阿曼', PA: '巴拿马',
  PE: '秘鲁', PG: '巴布亚新几内亚', PH: '菲律宾', PK: '巴基斯坦', PL: '波兰',
  PT: '葡萄牙', PW: '帕劳', PY: '巴拉圭', QA: '卡塔尔', RO: '罗马尼亚',
  RS: '塞尔维亚', RU: '俄罗斯', RW: '卢旺达', SA: '沙特阿拉伯', SB: '所罗门群岛',
  SC: '塞舌尔', SD: '苏丹', SE: '瑞典', SG: '新加坡', SI: '斯洛文尼亚',
  SK: '斯洛伐克', SL: '塞拉利昂', SM: '圣马力诺', SN: '塞内加尔', SO: '索马里',
  SR: '苏里南', SS: '南苏丹', ST: '圣多美和普林西比', SV: '萨尔瓦多', SY: '叙利亚',
  SZ: '斯威士兰', TD: '乍得', TG: '多哥', TH: '泰国', TJ: '塔吉克斯坦',
  TL: '东帝汶', TM: '土库曼斯坦', TN: '突尼斯', TO: '汤加', TR: '土耳其',
  TT: '特立尼达和多巴哥', TV: '图瓦卢', TZ: '坦桑尼亚', UA: '乌克兰', UG: '乌干达',
  US: '美国', UY: '乌拉圭', UZ: '乌兹别克斯坦', VA: '梵蒂冈', VC: '圣文森特和格林纳丁斯',
  VE: '委内瑞拉', VN: '越南', VU: '瓦努阿图', WS: '萨摩亚', YE: '也门',
  ZA: '南非', ZM: '赞比亚', ZW: '津巴布韦', ZZ: '未知',
  HK: '香港', MO: '澳门', TW: '台湾',
};


const socksPort = import.meta.env.VITE_SOCKS_PORT || '1080';

async function fetchAccounts() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/socks-accounts', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) accounts.value = data.data;
  } catch {
    appStore.showToast('加载账户失败', 'error');
  }
}

async function handleCreate() {
  if (!form.value.username || !form.value.password) {
    appStore.showToast('用户名和密码不能为空', 'error'); return;
  }
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/socks-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form.value, countryFilter: form.value.countryFilter || undefined })
    });
    const data = await res.json();
    if (data.success) {
      accounts.value.unshift(data.data);
      form.value = { username: '', password: '', mode: 'rotate', maxDelay: undefined, countryFilter: '', countryFilterMode: 'include' };
      showForm.value = false;
      appStore.showToast('账户创建成功', 'success');
    } else {
      appStore.showToast(data.error || '创建失败', 'error');
    }
  } catch {
    appStore.showToast('创建失败', 'error');
  }
}

async function handleModeChange(acc: SocksAccount, mode: 'rotate' | 'sticky') {
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode })
    });
    acc.mode = mode;
    appStore.showToast('模式已更新', 'success');
  } catch {
    appStore.showToast('更新失败', 'error');
  }
}

async function handleMaxDelayChange(acc: SocksAccount, value: string) {
  const maxDelay = value === '' ? undefined : Number(value);
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ maxDelay: value === '' ? null : Number(value) })
    });
    acc.maxDelay = maxDelay;
    appStore.showToast('延迟要求已更新', 'success');
  } catch {
    appStore.showToast('更新失败', 'error');
  }
}

async function handleCountryFilterChange(acc: SocksAccount, countryFilter: string, countryFilterMode: 'include' | 'exclude') {
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ countryFilter: countryFilter.trim() || null, countryFilterMode })
    });
    acc.countryFilter = countryFilter.trim() || undefined;
    acc.countryFilterMode = countryFilterMode;
    appStore.showToast('国家筛选已更新', 'success');
  } catch {
    appStore.showToast('更新失败', 'error');
  }
}

async function handleToggleEnabled(acc: SocksAccount) {
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: !acc.enabled })
    });
    acc.enabled = !acc.enabled;
  } catch {
    appStore.showToast('更新失败', 'error');
  }
}

async function handleDelete(id: string) {
  if (!confirm('确认删除该账户？')) return;
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/socks-accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    accounts.value = accounts.value.filter(a => a.id !== id);
    appStore.showToast('删除成功', 'success');
  } catch {
    appStore.showToast('删除失败', 'error');
  }
}

function togglePassword(id: string) {
  if (visiblePasswords.value.has(id)) {
    visiblePasswords.value.delete(id);
  } else {
    visiblePasswords.value.add(id);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN');
}

onMounted(fetchAccounts);
</script>
