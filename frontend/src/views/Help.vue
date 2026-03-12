<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-1">使用帮助</h2>
      <p class="text-slate-500 dark:text-slate-400 text-sm">以下是 <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">/api/getSingleProxy</code> 接口的使用说明</p>
    </div>

    <!-- 接口说明 -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">接口说明</h3>
      <div class="space-y-3 text-sm text-slate-700 dark:text-slate-300">
        <div class="flex items-center gap-3">
          <span class="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-mono font-bold text-xs">GET</span>
          <code class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono">/api/getSingleProxy</code>
        </div>
        <p class="text-slate-600 dark:text-slate-400">从代理池中随机获取一条有效代理，支持按协议类型和最大响应延迟过滤。</p>
      </div>
    </div>

    <!-- 请求参数 -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">请求参数</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th class="text-left py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">参数名</th>
              <th class="text-left py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">类型</th>
              <th class="text-left py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">必填</th>
              <th class="text-left py-2 font-semibold text-slate-700 dark:text-slate-300">说明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr>
              <td class="py-3 pr-4"><code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">protocol</code></td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">string</td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">否</td>
              <td class="py-3 text-slate-600 dark:text-slate-400">代理协议类型，可选值：<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">http</code>、<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">https</code>、<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">socks4</code>、<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">socks5</code>，不传则不限协议</td>
            </tr>
            <tr>
              <td class="py-3 pr-4"><code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">delay</code></td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">number</td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">否</td>
              <td class="py-3 text-slate-600 dark:text-slate-400">最大响应延迟（毫秒），仅返回响应时间小于等于该值的代理，不传则不限延迟</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 响应格式 -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">响应格式</h3>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">成功响应（HTTP 200）：</p>
      <pre class="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto"><code>{
  "success": true,
  "data": {
    "proxy": "http://host:port",
    "protocol": "http",
    "host": "1.2.3.4",
    "port": 8080,
    "responseTime": 320
  }
}</code></pre>
      <p class="text-sm text-slate-600 dark:text-slate-400 mt-4 mb-3">无可用代理（HTTP 404）：</p>
      <pre class="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto"><code>{
  "success": false,
  "error": "没有可用的代理"
}</code></pre>
    </div>

    <!-- 响应字段说明 -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">响应字段说明</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th class="text-left py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">字段名</th>
              <th class="text-left py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">类型</th>
              <th class="text-left py-2 font-semibold text-slate-700 dark:text-slate-300">说明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr>
              <td class="py-3 pr-4"><code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">proxy</code></td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">string</td>
              <td class="py-3 text-slate-600 dark:text-slate-400">完整代理地址，格式为 <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">协议://host:port</code>，含认证信息时为 <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">协议://user:pass@host:port</code></td>
            </tr>
            <tr>
              <td class="py-3 pr-4"><code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">protocol</code></td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">string</td>
              <td class="py-3 text-slate-600 dark:text-slate-400">代理协议类型</td>
            </tr>
            <tr>
              <td class="py-3 pr-4"><code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">host</code></td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">string</td>
              <td class="py-3 text-slate-600 dark:text-slate-400">代理服务器地址</td>
            </tr>
            <tr>
              <td class="py-3 pr-4"><code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">port</code></td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">number</td>
              <td class="py-3 text-slate-600 dark:text-slate-400">代理服务器端口</td>
            </tr>
            <tr>
              <td class="py-3 pr-4"><code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">responseTime</code></td>
              <td class="py-3 pr-4 text-slate-500 dark:text-slate-400">number</td>
              <td class="py-3 text-slate-600 dark:text-slate-400">实测响应延迟（毫秒）</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 调用示例 -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">调用示例</h3>
      <div class="space-y-4">
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">随机获取一条代理</p>
          <div class="relative">
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto"><code>GET /api/getSingleProxy</code></pre>
            <button @click="copy('GET /api/getSingleProxy')" class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">复制</button>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">获取 HTTP 协议代理</p>
          <div class="relative">
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto"><code>GET /api/getSingleProxy?protocol=http</code></pre>
            <button @click="copy('GET /api/getSingleProxy?protocol=http')" class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">复制</button>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">获取延迟不超过 500ms 的 SOCKS5 代理</p>
          <div class="relative">
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto"><code>GET /api/getSingleProxy?protocol=socks5&amp;delay=500</code></pre>
            <button @click="copy('GET /api/getSingleProxy?protocol=socks5&delay=500')" class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">复制</button>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">curl 示例</p>
          <div class="relative">
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto"><code>curl "http://localhost:3000/api/getSingleProxy?protocol=http&delay=1000"</code></pre>
            <button @click="copy('curl &quot;http://localhost:3000/api/getSingleProxy?protocol=http&delay=1000&quot;')" class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">复制</button>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Python 示例</p>
          <div class="relative">
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto"><code>import requests

resp = requests.get('http://localhost:3000/api/getSingleProxy', params={'protocol': 'http', 'delay': 1000})
data = resp.json()
if data['success']:
    proxy_url = data['data']['proxy']
    proxies = {'http': proxy_url, 'https': proxy_url}
    r = requests.get('https://example.com', proxies=proxies)
    print(r.status_code)</code></pre>
            <button @click="copyPython()" class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">复制</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
function copy(text: string) {
  navigator.clipboard.writeText(text);
}

function copyPython() {
  const code = `import requests

resp = requests.get('http://localhost:3000/api/getSingleProxy', params={'protocol': 'http', 'delay': 1000})
data = resp.json()
if data['success']:
    proxy_url = data['data']['proxy']
    proxies = {'http': proxy_url, 'https': proxy_url}
    r = requests.get('https://example.com', proxies=proxies)
    print(r.status_code)`;
  navigator.clipboard.writeText(code);
}
</script>
