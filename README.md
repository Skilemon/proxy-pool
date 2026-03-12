# ProxyPool

一个基于 Vue 3 + Express + SQLite 的代理池管理系统，支持代理的添加、验证、导入导出和自动获取。

## 功能特性

- ✅ 代理管理：添加、删除、导入、导出代理
- ✅ 自动验证：定时验证代理可用性
- ✅ 来源管理：从外部 URL 自动获取代理
- ✅ 统计面板：实时查看代理统计信息
- ✅ API 服务：提供 HTTP API 获取可用代理
- ✅ 深色模式：支持浅色/深色主题切换
- ✅ Docker 部署：一键部署，数据持久化

## 技术栈

**前端**
- Vue 3 + TypeScript + Composition API
- Pinia (状态管理)
- Vue Router (路由)
- Tailwind CSS (样式)
- Axios (HTTP 客户端)
- Vite (构建工具)

**后端**
- Express + TypeScript
- SQLite3 (数据库)
- node-cron (定时任务)
- axios (代理验证)

## 快速开始

### 使用 Docker (推荐)

```bash
# 1. 克隆项目
git clone <repo-url>
cd ProxyPool

# 2. 启动服务
docker-compose up -d

# 3. 访问
# 前端界面: http://localhost:8416
# API 文档: http://localhost:8416/api/stats
# 获取代理: http://localhost:8416/api/getSingleProxy
```

数据将持久化在 `./data/proxypool.db`

### 本地开发

**安装依赖**

```bash
# 安装所有依赖
npm run install:all
```

**启动开发服务器**

```bash
# 终端 1: 启动后端
npm run dev:backend

# 终端 2: 启动前端
npm run dev:frontend
```

- 前端开发服务器: http://localhost:5173
- 后端 API 服务器: http://localhost:8416

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
│   │   ├── components/      # 组件
│   │   ├── views/           # 页面
│   │   ├── stores/          # Pinia stores
│   │   ├── router/          # 路由配置
│   │   ├── types/           # TypeScript 类型
│   │   └── App.vue
│   └── package.json
├── backend/                  # Node.js 后端
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── routes/          # 路由
│   │   ├── middleware/      # 中间件
│   │   ├── database/        # 数据库
│   │   ├── utils/           # 工具函数
│   │   └── app.ts
│   └── package.json
├── data/                     # 数据目录
│   └── proxypool.db         # SQLite 数据库
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API 接口

### 管理 API

**代理管理**
- `GET /api/proxies` - 获取所有代理
- `POST /api/proxies` - 添加单个代理
- `POST /api/proxies/import` - 批量导入代理
- `GET /api/proxies/export` - 导出代理
- `DELETE /api/proxies` - 删除代理

**来源管理**
- `GET /api/sources` - 获取所有来源
- `POST /api/sources` - 添加来源
- `PUT /api/sources/:id` - 更新来源
- `DELETE /api/sources/:id` - 删除来源
- `POST /api/sources/:id/fetch` - 从指定来源获取
- `POST /api/sources/fetch-all` - 从所有来源获取

**统计信息**
- `GET /api/stats` - 获取统计数据

**设置管理**
- `GET /api/settings` - 获取设置
- `PUT /api/settings` - 更新设置

**任务触发**
- `POST /api/validate` - 立即验证所有代理
- `POST /api/fetch` - 立即从所有来源获取代理

### 对外 API

**获取可用代理**
```bash
# 获取任意协议的可用代理
curl http://localhost:8416/api/getSingleProxy

# 获取指定协议的可用代理
curl http://localhost:8416/api/getSingleProxy?protocol=http
```

响应示例：
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

# 测试 URL
TEST_URL=http://www.gstatic.com/generate_204
```

## 使用说明

### 1. 添加代理

在"代理列表"页面点击"添加代理"，填写代理信息：
- 协议：http/https/socks4/socks5
- 主机：IP 地址或域名
- 端口：端口号
- 用户名/密码：可选

### 2. 批量导入

点击"导入代理"，每行一个代理，支持格式：
```
http://123.45.67.89:8080
socks5://user:pass@123.45.67.89:1080
```

### 3. 添加来源

在"来源管理"页面添加代理来源 URL，系统会定时从这些来源获取代理。

### 4. 系统设置

在"系统设置"页面配置：
- 验证间隔：多久验证一次代理
- 获取间隔：多久从来源获取一次代理
- 验证超时：验证代理的超时时间
- 验证并发数：同时验证多少个代理

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

## 数据备份

数据库文件位于 `./data/proxypool.db`，定期备份此文件即可。

```bash
# 备份
cp ./data/proxypool.db ./data/proxypool.db.backup

# 恢复
cp ./data/proxypool.db.backup ./data/proxypool.db
```

## 许可证

MIT License
