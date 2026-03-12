# Stage 1: 构建前端
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: 构建后端
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: 生产环境
FROM node:22-alpine
WORKDIR /app

# 复制后端构建产物和依赖
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package*.json ./

# 复制前端构建产物到 public 目录
COPY --from=frontend-builder /app/frontend/dist ./public

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 8416

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8416
ENV DB_PATH=/app/data/proxypool.db

# 启动应用
CMD ["node", "dist/app.js"]
