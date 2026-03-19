# Stage 1: 构建前端
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci --workspace frontend
COPY frontend/ ./frontend/
RUN npm run build --workspace frontend

# Stage 2: 生产环境
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

COPY --from=frontend-builder /app/frontend/dist ./public

RUN mkdir -p /app/data

EXPOSE 8416

ENV NODE_ENV=production
ENV PORT=8416
ENV DB_PATH=/app/data/proxypool.db

CMD ["python", "app.py"]
