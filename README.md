# ProxyPool

一个基于 Vue 3 + Express + SQLite 的代理池管理系统，支持代理的添加、验证、导入导出和自动获取。

## 功能特性

- 代理管理：添加、删除、批量导入、导出代理
- 自动验证：定时验证代理可用性，支持 HTTP/HTTPS/SOCKS4/SOCKS5
- 来源管理：从外部 URL 自动获取代理
- 统计面板：实时查看代理统计信息
- API 服务：提供 HTTP API 获取可用代理（无需认证）
- 身份验证：JWT 登录保护管理接口，默认密码 `admin`
- 深色模式：支持浅色/深色主题切换
- Docker 部署：多阶段构建，一键部署，数据持久化

## 技术栈

**前端**
- Vue 3 + TypeScript + Composition API
- Pinia（状态管理）
- Vue Router（路由）
- Tailwind CSS（样式）
- Axios（HTTP 客户端）
- Vite（构建工具）

**后端**
- Express + TypeScript
- SQLite3（数据库）
- node-cron（定时任务）
- jsonwebtoken（JWT 认证）
- axios + socks-proxy-agent（代理验证）

## 快速开始

### 使用 Docker（推荐）

**方式一：使用预构建镜像（推荐）**

```bash
docker run -d \
  --name proxypool \
  -p 8416:8416 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/skilemon/proxypool:latest
```

**方式二：使用 Docker Compose**

```bash
# 1. 克隆项目
git clone <repo-url>
cd ProxyPool

# 2. 启动服务
docker-compose up -d

# 3. 访问
# 前端界面: http://localhost:8416
# 获取代理: http://localhost:8416/getProxies
```

数据将持久化在宿主机 `./data/proxypool.db`。

### 本地开发

**安装依赖**

```bash
npm run install:all
```

**启动开发服务器**

```bash
# 终端 1：启动后端
npm run dev:backend

# 终端 2：启动前端
npm run dev:frontend
```

- 前端开发服务器：http://localhost:5173
- 后端 API 服务器：http://localhost:8416

**构建生产版本**

```bash
# 构建前后端
npm run build

# 启动生产服务器
npm run start
```

## 项目结构

```
ProxyPool/
├── frontend/                 # Vue 前端
│   ├── src/
│   │   ├── api/             # API 请求封装
│   │   ├── components/      # 公共组件
│   │   ├── views/           # 页面视图
│   │   ├── stores/          # Pinia 状态
│   │   ├── router/          # 路由配置
│   │   └── types/           # TypeScript 类型
│   └── package.json
├── backend/                  # Node.js 后端
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── routes/          # 路由
│   │   ├── middleware/      # 中间件（认证、日志、错误处理）
│   │   ├── database/        # 数据库连接
│   │   ├── utils/           # 工具函数
│   │   └── app.ts           # 应用入口
│   └── package.json
├── data/                     # 数据持久化目录（Docker 挂载点）
│   └── proxypool.db         # SQLite 数据库
├── .github/workflows/       # CI/CD（GitHub Actions 构建推送镜像）
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API 接口

> 管理 API 需要在请求头中携带 JWT Token：`Authorization: Bearer <token>`
> 登录接口和 `getProxies` 接口无需认证。

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/login` | 登录获取 Token（默认密码：`admin`） |
| `POST` | `/api/auth/change-password` | 修改登录密码 |

登录请求体：

```json
{ "password": "admin" }
```

登录响应：

```json
{
  "success": true,
  "data": { "token": "<JWT Token>" }
}
```

Token 有效期为 24 小时。

### 代理管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/proxies` | 获取所有代理 |
| `POST` | `/api/proxies` | 添加单个代理 |
| `POST` | `/api/proxies/batch` | 批量添加代理 |
| `POST` | `/api/proxies/import` | 从文本批量导入代理 |
| `GET` | `/api/proxies/export` | 导出代理为文本文件 |
| `DELETE` | `/api/proxies/:id` | 删除单个代理 |
| `DELETE` | `/api/proxies` | 批量删除代理 |

### 来源管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sources` | 获取所有来源 |
| `POST` | `/api/sources` | 添加来源 |
| `PUT` | `/api/sources/:id` | 更新来源 |
| `DELETE` | `/api/sources/:id` | 删除来源 |
| `POST` | `/api/sources/:id/fetch` | 从指定来源立即获取 |
| `POST` | `/api/sources/fetch-all` | 从所有来源立即获取 |

### 统计与设置

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/stats` | 获取统计数据 |
| `GET` | `/api/settings` | 获取当前设置 |
| `PUT` | `/api/settings` | 更新设置 |

### 任务触发

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/validate` | 立即验证所有代理 |
| `POST` | `/api/fetch` | 立即从所有来源获取代理 |

### 对外 API（无需认证）

```
GET /getProxies
```

从代理池中随机获取一条有效代理，支持按协议和响应延迟过滤。

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `protocol` | string | 否 | 协议类型：`http`、`https`、`socks4`、`socks5`，不传则不限 |
| `delay` | number | 否 | 最大响应延迟（毫秒），仅返回不超过该值的代理 |

**响应示例**

```json
{
  "success": true,
  "data": {
    "proxy": "http://123.45.67.89:8080",
    "protocol": "http",
    "host": "123.45.67.89",
    "port": 8080,
    "responseTime": 234
  }
}
```

**调用示例**

```bash
# 随机获取一条代理
curl http://localhost:8416/getProxies

# 获取 HTTP 协议代理
curl http://localhost:8416/getProxies?protocol=http

# 获取延迟不超过 500ms 的 SOCKS5 代理
curl "http://localhost:8416/getProxies?protocol=socks5&delay=500"
```

```python
import requests

resp = requests.get('http://localhost:8416/getProxies',
                    params={'protocol': 'http', 'delay': 1000})
data = resp.json()
if data['success']:
    proxy_url = data['data']['proxy']
    proxies = {'http': proxy_url, 'https': proxy_url}
    r = requests.get('https://example.com', proxies=proxies)
    print(r.status_code)
```

> **速率限制**：所有 `/api` 接口每分钟最多请求 100 次。

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# 服务端口
PORT=8416

# 数据库路径
DB_PATH=/app/data/proxypool.db

# 验证间隔（分钟）
VALIDATION_INTERVAL=30

# 获取来源间隔（分钟）
FETCH_INTERVAL=60

# 验证超时（毫秒）
VALIDATION_TIMEOUT=5000

# 验证并发数
VALIDATION_CONCURRENCY=10

# 测试 URL（用于验证代理可用性）
TEST_URL=https://cp.cloudflare.com/generate_204

# JWT 密钥（生产环境请务必修改）
JWT_SECRET=proxypool-secret-key
```

## 使用说明

### 1. 登录

首次访问 `http://localhost:8416` 会跳转到登录页，默认密码为 `admin`。
建议登录后在「系统设置」页面及时修改密码。

### 2. 添加代理

在「代理列表」页面点击「添加代理」，填写：
- 协议：`http` / `https` / `socks4` / `socks5`
- 主机：IP 地址或域名
- 端口：端口号
- 用户名/密码：可选

### 3. 批量导入

点击「导入代理」，每行一个代理，支持格式：

```
http://123.45.67.89:8080
socks5://user:pass@123.45.67.89:1080
```

### 4. 添加来源

在「来源管理」页面添加代理来源 URL，系统会按设定间隔自动从这些 URL 抓取代理列表。

### 5. 系统设置

在「系统设置」页面可配置：
- 验证间隔：多久自动验证一次代理（默认 30 分钟）
- 获取间隔：多久从来源获取一次代理（默认 60 分钟）
- 验证超时：单个代理验证超时时间（默认 5000ms）
- 验证并发数：同时验证的代理数量（默认 10）
- 测试 URL：用于验证代理可用性的目标地址
- 管理密码：修改登录密码

## Docker 部署

### 构建镜像

```bash
docker build -t proxypool:latest .
```

### 运行容器

```bash
docker run -d \
  --name proxypool \
  -p 8416:8416 \
  -v $(pwd)/data:/app/data \
  -e VALIDATION_INTERVAL=30 \
  -e FETCH_INTERVAL=60 \
  -e JWT_SECRET=your-secret-key \
  proxypool:latest
```

### 使用 Docker Compose

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down

# 重启
docker-compose restart
```

### 自动构建镜像

本项目通过 GitHub Actions 自动构建并推送多平台镜像（`linux/amd64`、`linux/arm64`）到 GitHub Container Registry（GHCR）。

## 数据备份

数据库文件位于宿主机 `./data/proxypool.db`，定期备份此文件即可。

```bash
# 备份
cp ./data/proxypool.db ./data/proxypool.db.backup

# 恢复
cp ./data/proxypool.db.backup ./data/proxypool.db
```

## 许可证

MIT License
