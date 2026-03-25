# ─── 阶段 1：构建前端 ───────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─── 阶段 2：运行后端 ───────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# 安装 Python 依赖
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./

# 将前端构建产物复制到 Flask 静态目录
COPY --from=frontend-builder /frontend/dist ./public

# 数据持久化目录
VOLUME ["/app/data"]

EXPOSE 8416

ENV PORT=8416

CMD ["gunicorn", "--bind", "0.0.0.0:8416", "--workers", "1", "--threads", "4", "--timeout", "120", "wsgi:app"]
