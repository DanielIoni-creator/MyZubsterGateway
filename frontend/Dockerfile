# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — build
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

# 依赖清单先复制、先安装，利用 Docker 层缓存加速重复构建
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .

# 构建时注入运行时环境变量（仅 VITE_* 前缀会被 Vite 内联进产物）
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ============================================================
# Stage 2 — runtime (nginx)
# ============================================================
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 健康检查：命中 nginx 的 /healthz 端点
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
