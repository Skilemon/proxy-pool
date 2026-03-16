<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">代理列表</h2>
        <div class="flex gap-2">
          <button @click="handleValidateNow" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
            立即验证
          </button>
          <button @click="showAddForm = !showAddForm" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            添加代理
          </button>
          <button @click="showImportForm = !showImportForm" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            导入代理
          </button>
          <button @click="handleExport" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
            导出选中
          </button>
          <button @click="handleDeleteSelected" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            删除选中
          </button>
        </div>
      </div>

      <div v-if="showAddForm" class="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">添加代理</h3>
        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select v-model="newProxy.protocol" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
          <input v-model="newProxy.host" placeholder="主机/IP" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model.number="newProxy.port" type="number" placeholder="端口" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model="newProxy.username" placeholder="用户名(可选)" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <input v-model="newProxy.password" placeholder="密码(可选)" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white" />
          <button @click="handleAddProxy" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">提交</button>
        </div>
      </div>

      <div v-if="showImportForm" class="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">批量导入</h3>
        <div class="mb-3 flex items-center gap-3">
          <label class="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">导入类型:</label>
          <select v-model="importProtocol" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white">
            <option value="">自动识别</option>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ importProtocol ? `选择后将自动为无协议前缀的行补充 ${importProtocol}://` : '根据每行内容自动识别协议' }}</span>
        </div>
        <textarea
          v-model="importContent"
          rows="6"
          :placeholder="importProtocol ? `每行一个代理，格式: ip:port 或 ${importProtocol}://ip:port` : '每行一个代理，格式: http://ip:port 或 socks5://user:pass@ip:port'"
          class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-600 dark:text-white"
        />
        <div v-if="importValidationWarnings.length > 0" class="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
          <p class="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-1">格式提示:</p>
          <p v-for="(w, i) in importValidationWarnings" :key="i" class="text-xs text-yellow-600 dark:text-yellow-500">{{ w }}</p>
        </div>
        <div class="mt-3 flex gap-2">
          <button @click="handleImport" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">开始导入</button>
          <button @click="showImportForm = false" class="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600">取消</button>
        </div>
      </div>

      <div class="mb-4 flex flex-wrap gap-4 items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 dark:text-slate-400">协议:</label>
          <select v-model="proxyStore.protocolFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option value="all">全部</option>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 dark:text-slate-400">可用性:</label>
          <select v-model="proxyStore.statusFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option value="all">全部</option>
            <option value="valid">有效</option>
            <option value="invalid">无效</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 dark:text-slate-400">响应时间:</label>
          <select v-model="proxyStore.responseTimeFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option value="all">全部</option>
            <option value="500">500ms 以内</option>
            <option value="1000">1000ms 以内</option>
            <option value="2000">2000ms 以内</option>
            <option value="5000">5000ms 以内</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 dark:text-slate-400">国家:</label>
          <select v-model="proxyStore.countryFilter" class="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option value="all">全部</option>
            <option value="unknown">未知</option>
            <option v-for="c in proxyStore.availableCountries" :key="c" :value="c">{{ countryName(c) }}</option>
          </select>
        </div>
        <span class="ml-auto text-sm text-slate-500 dark:text-slate-400">
          共 {{ proxyStore.total }} 条
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-700">
              <th class="p-3 text-left">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">协议</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">主机</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">端口</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">国家</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">状态</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">响应时间</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">创建时间</th>
              <th class="p-3 text-left text-slate-700 dark:text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="proxy in proxyStore.proxies" :key="proxy.id" class="border-b border-slate-200 dark:border-slate-700">
              <td class="p-3">
                <input
                  type="checkbox"
                  :checked="proxyStore.selectedIds.includes(proxy.id)"
                  @change="proxyStore.toggleSelection(proxy.id)"
                />
              </td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.protocol.toUpperCase() }}</td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.host }}</td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.port }}</td>
              <td class="p-3 text-slate-900 dark:text-white">{{ countryName(proxy.country) }}</td>
              <td class="p-3">
                <span
                  class="px-2 py-1 rounded text-sm"
                  :class="proxy.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                >
                  {{ proxy.isValid ? '有效' : '无效' }}
                </span>
              </td>
              <td class="p-3 text-slate-900 dark:text-white">{{ proxy.responseTime ? `${proxy.responseTime}ms` : '-' }}</td>
              <td class="p-3 text-slate-900 dark:text-white">{{ formatDate(proxy.createdAt) }}</td>
              <td class="p-3 flex gap-1">
                <button
                  @click="copyProxy(proxy)"
                  class="px-3 py-1 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-500 text-sm"
                >复制</button>
                <button
                  @click="handleValidateSingle(proxy.id)"
                  class="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 text-sm"
                >验证</button>
                <button
                  @click="handleDeleteSingle(proxy.id)"
                  class="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
                >删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="proxyStore.proxies.length === 0 && !proxyStore.loading" class="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无代理数据
        </div>
      </div>

      <!-- 分页控件 -->
      <div v-if="proxyStore.totalPages > 1" class="mt-4 flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>每页</span>
          <select v-model="proxyStore.pageSize" class="px-2 py-1 border rounded-lg bg-white dark:bg-slate-700 dark:text-white">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <span>条</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="proxyStore.currentPage = 1"
            :disabled="proxyStore.currentPage === 1"
            class="px-2 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >«</button>
          <button
            @click="proxyStore.currentPage--"
            :disabled="proxyStore.currentPage === 1"
            class="px-3 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >‹</button>
          <button
            v-for="page in proxyStore.visiblePages"
            :key="page"
            @click="proxyStore.currentPage = page"
            class="px-3 py-1 rounded border text-sm"
            :class="page === proxyStore.currentPage
              ? 'bg-blue-500 text-white border-blue-500'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white'"
          >{{ page }}</button>
          <button
            @click="proxyStore.currentPage++"
            :disabled="proxyStore.currentPage === proxyStore.totalPages"
            class="px-3 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >›</button>
          <button
            @click="proxyStore.currentPage = proxyStore.totalPages"
            :disabled="proxyStore.currentPage === proxyStore.totalPages"
            class="px-2 py-1 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
          >»</button>
        </div>
        <span class="text-sm text-slate-600 dark:text-slate-400">
          第 {{ proxyStore.currentPage }} / {{ proxyStore.totalPages }} 页
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useProxyStore } from '@/stores/proxyStore';
import { api } from '@/api/client';
import { useAppStore } from '@/stores/appStore';

const proxyStore = useProxyStore();
const appStore = useAppStore();

const countryCodeMap: Record<string, string> = {
  AF: '阿富汗', AL: '阿尔巴尼亚', DZ: '阿尔及利亚', AD: '安道尔', AO: '安哥拉',
  AG: '安提瓜和巴布达', AR: '阿根廷', AM: '亚美尼亚', AU: '澳大利亚', AT: '奥地利',
  AZ: '阿塞拜疆', BS: '巴哈马', BH: '巴林', BD: '孟加拉国', BB: '巴巴多斯',
  BY: '白俄罗斯', BE: '比利时', BZ: '伯利兹', BJ: '贝宁', BT: '不丹',
  BO: '玻利维亚', BA: '波黑', BW: '博茨瓦纳', BR: '巴西', BN: '文莱',
  BG: '保加利亚', BF: '布基纳法索', BI: '布隆迪', CV: '佛得角', KH: '柬埔寨',
  CM: '喀麦隆', CA: '加拿大', CF: '中非', TD: '乍得', CL: '智利',
  CN: '中国', CO: '哥伦比亚', KM: '科摩罗', CG: '刚果共和国', CD: '刚果民主共和国',
  CR: '哥斯达黎加', HR: '克罗地亚', CU: '古巴', CY: '塞浦路斯', CZ: '捷克',
  DK: '丹麦', DJ: '吉布提', DM: '多米尼克', DO: '多米尼加', EC: '厄瓜多尔',
  EG: '埃及', SV: '萨尔瓦多', GQ: '赤道几内亚', ER: '厄立特里亚', EE: '爱沙尼亚',
  SZ: '斯威士兰', ET: '埃塞俄比亚', FJ: '斐济', FI: '芬兰', FR: '法国',
  GA: '加蓬', GM: '冈比亚', GE: '格鲁吉亚', DE: '德国', GH: '加纳',
  GR: '希腊', GD: '格林纳达', GT: '危地马拉', GN: '几内亚', GW: '几内亚比绍',
  GY: '圭亚那', HT: '海地', HN: '洪都拉斯', HU: '匈牙利', IS: '冰岛',
  IN: '印度', ID: '印度尼西亚', IR: '伊朗', IQ: '伊拉克', IE: '爱尔兰',
  IL: '以色列', IT: '意大利', JM: '牙买加', JP: '日本', JO: '约旦',
  KZ: '哈萨克斯坦', KE: '肯尼亚', KI: '基里巴斯', KP: '朝鲜', KR: '韩国',
  KW: '科威特', KG: '吉尔吉斯斯坦', LA: '老挝', LV: '拉脱维亚', LB: '黎巴嫩',
  LS: '莱索托', LR: '利比里亚', LY: '利比亚', LI: '列支敦士登', LT: '立陶宛',
  LU: '卢森堡', MG: '马达加斯加', MW: '马拉维', MY: '马来西亚', MV: '马尔代夫',
  ML: '马里', MT: '马耳他', MH: '马绍尔群岛', MR: '毛里塔尼亚', MU: '毛里求斯',
  MX: '墨西哥', FM: '密克罗尼西亚', MD: '摩尔多瓦', MC: '摩纳哥', MN: '蒙古',
  ME: '黑山', MA: '摩洛哥', MZ: '莫桑比克', MM: '缅甸', NA: '纳米比亚',
  NR: '瑙鲁', NP: '尼泊尔', NL: '荷兰', NZ: '新西兰', NI: '尼加拉瓜',
  NE: '尼日尔', NG: '尼日利亚', MK: '北马其顿', NO: '挪威', OM: '阿曼',
  PK: '巴基斯坦', PW: '帕劳', PA: '巴拿马', PG: '巴布亚新几内亚', PY: '巴拉圭',
  PE: '秘鲁', PH: '菲律宾', PL: '波兰', PT: '葡萄牙', QA: '卡塔尔',
  RO: '罗马尼亚', RU: '俄罗斯', RW: '卢旺达', KN: '圣基茨和尼维斯', LC: '圣卢西亚',
  VC: '圣文森特和格林纳丁斯', WS: '萨摩亚', SM: '圣马力诺', ST: '圣多美和普林西比',
  SA: '沙特阿拉伯', SN: '塞内加尔', RS: '塞尔维亚', SC: '塞舌尔', SL: '塞拉利昂',
  SG: '新加坡', SK: '斯洛伐克', SI: '斯洛文尼亚', SB: '所罗门群岛', SO: '索马里',
  ZA: '南非', SS: '南苏丹', ES: '西班牙', LK: '斯里兰卡', SD: '苏丹',
  SR: '苏里南', SE: '瑞典', CH: '瑞士', SY: '叙利亚', TW: '台湾',
  TJ: '塔吉克斯坦', TZ: '坦桑尼亚', TH: '泰国', TL: '东帝汶', TG: '多哥',
  TO: '汤加', TT: '特立尼达和多巴哥', TN: '突尼斯', TR: '土耳其', TM: '土库曼斯坦',
  TV: '图瓦卢', UG: '乌干达', UA: '乌克兰', AE: '阿联酋', GB: '英国',
  US: '美国', UY: '乌拉圭', UZ: '乌兹别克斯坦', VU: '瓦努阿图', VE: '委内瑞拉',
  VN: '越南', YE: '也门', ZM: '赞比亚', ZW: '津巴布韦', HK: '香港',
  MO: '澳门',
};

function countryName(code?: string): string {
  if (!code) return '未知';
  return countryCodeMap[code.toUpperCase()] ?? code;
}

const showAddForm = ref(false);
const showImportForm = ref(false);
const importContent = ref('');
const importProtocol = ref<'' | 'http' | 'https' | 'socks4' | 'socks5'>('');


const newProxy = ref({
  protocol: 'http' as 'http' | 'https' | 'socks4' | 'socks5',
  host: '',
  port: 8080,
  username: '',
  password: '',
  country: '',
  isValid: false
});


const isAllSelected = computed(() => {
  return proxyStore.proxies.length > 0 &&
    proxyStore.proxies.every(proxy => proxyStore.selectedIds.includes(proxy.id));
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    const pageIds = proxyStore.proxies.map(p => p.id);
    pageIds.forEach(id => {
      if (proxyStore.selectedIds.includes(id)) proxyStore.toggleSelection(id);
    });
  } else {
    proxyStore.proxies.forEach(proxy => {
      if (!proxyStore.selectedIds.includes(proxy.id)) proxyStore.toggleSelection(proxy.id);
    });
  }
}

async function handleAddProxy() {
  try {
    await proxyStore.addProxy({
      ...newProxy.value,
      username: newProxy.value.username || undefined,
      password: newProxy.value.password || undefined,
      country: newProxy.value.country || undefined
    });

    appStore.showToast('代理添加成功', 'success');
    showAddForm.value = false;
    newProxy.value = {
      protocol: 'http',
      host: '',
      port: 8080,
      username: '',
      password: '',
      country: '',
      isValid: false
    };
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

const PROTOCOL_PREFIXES = ['http://', 'https://', 'socks4://', 'socks5://'];

const importValidationWarnings = computed(() => {
  if (!importContent.value.trim() || !importProtocol.value) return [];
  const warnings: string[] = [];
  const lines = importContent.value.split('\n').map(l => l.trim()).filter(Boolean);
  const noPrefix = lines.filter(l => !PROTOCOL_PREFIXES.some(p => l.toLowerCase().startsWith(p)));
  if (noPrefix.length > 0) {
    warnings.push(`${noPrefix.length} 行没有协议前缀，将自动添加 ${importProtocol.value}://`);
  }
  const wrongPrefix = lines.filter(l =>
    PROTOCOL_PREFIXES.some(p => l.toLowerCase().startsWith(p)) &&
    !l.toLowerCase().startsWith(importProtocol.value + '://')
  );
  if (wrongPrefix.length > 0) {
    warnings.push(`${wrongPrefix.length} 行的协议前缀与所选类型不符，将保留原有协议`);
  }
  return warnings;
});

function buildImportContent(): string {
  if (!importProtocol.value) return importContent.value;
  const lines = importContent.value.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    if (PROTOCOL_PREFIXES.some(p => line.toLowerCase().startsWith(p))) return line;
    return `${importProtocol.value}://${line}`;
  }).join('\n');
}

async function handleImport() {
  if (!importContent.value.trim()) {
    appStore.showToast('请输入导入内容', 'error');
    return;
  }

  try {
    const content = buildImportContent();
    const result = await proxyStore.importProxies(content);
    appStore.showToast(`导入成功: 新增 ${result.added} 条，重复 ${result.duplicates} 条`, 'success');
    importContent.value = '';
    importProtocol.value = '';
    showImportForm.value = false;
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleValidateNow() {
  try {
    const ids = proxyStore.selectedIds.length > 0 ? proxyStore.selectedIds : undefined;
    await api.validateProxies(ids);
    const msg = ids ? `已触发验证 ${ids.length} 条选中代理，请稍后刷新查看结果` : '已触发验证全部代理，请稍后刷新查看结果';
    appStore.showToast(msg, 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleExport() {
  try {
    await proxyStore.exportProxies(proxyStore.selectedIds.length > 0 ? proxyStore.selectedIds : undefined);
    appStore.showToast('导出成功', 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleDeleteSelected() {
  if (proxyStore.selectedIds.length === 0) {
    appStore.showToast('请先选择要删除的代理', 'error');
    return;
  }

  if (!confirm(`确定删除 ${proxyStore.selectedIds.length} 条代理吗？`)) {
    return;
  }

  try {
    await proxyStore.deleteProxies(proxyStore.selectedIds);
    appStore.showToast('删除成功', 'success');
    if (proxyStore.currentPage > proxyStore.totalPages) {
      proxyStore.currentPage = proxyStore.totalPages;
    }
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleValidateSingle(id: string) {
  try {
    await api.validateProxies([id]);
    appStore.showToast('已触发验证，请稍后刷新查看结果', 'success');
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

async function handleDeleteSingle(id: string) {
  if (!confirm('确定删除该代理吗？')) return;
  try {
    await proxyStore.deleteProxies([id]);
    appStore.showToast('删除成功', 'success');
    if (proxyStore.currentPage > proxyStore.totalPages) {
      proxyStore.currentPage = proxyStore.totalPages;
    }
  } catch (error: any) {
    appStore.showToast(error.message, 'error');
  }
}

function copyProxy(proxy: any) {
  let text = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
  if (proxy.username && proxy.password) {
    text = `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
  }
  navigator.clipboard.writeText(text).then(() => {
    appStore.showToast('已复制到剪贴板', 'success');
  }).catch(() => {
    appStore.showToast('复制失败', 'error');
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN');
}

onMounted(() => {
  proxyStore.fetchProxies();
  proxyStore.fetchCountries();
});
</script>
