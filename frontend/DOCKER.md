# MyZubster Gateway — 前端 Docker 部署文档

生产可用的多阶段构建 Dockerfile，覆盖 issue #214 的全部要求。

## 目录

- [功能对照](#功能对照)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [健康检查](#健康检查)
- [日志](#日志)
- [Docker Compose 示例](#docker-compose-示例)
- [测试](#测试)
- [镜像优化说明](#镜像优化说明)

## 功能对照

| Issue #214 要求 | 实现 |
|---|---|
| 多阶段构建 | `node:20-alpine` 构建阶段 + `nginx:1.27-alpine` 运行阶段，最终镜像不含 node_modules 与构建工具链 |
| 环境变量配置 | `VITE_API_URL` 等 `VITE_*` 变量通过 `--build-arg` 在构建时内联（Vite 仅注入 `VITE_*` 前缀变量） |
| 健康检查 | nginx `/healthz` 端点 + Docker `HEALTHCHECK`（30s 间隔，3 次重试） |
| 日志设置 | nginx access/error 日志输出到 stdout/stderr，`docker logs` 开箱即用 |
| 使用文档 | 本文档（构建 / 运行 / Compose / 环境变量 / 健康检查 / 日志 / 测试） |
| 测试 | `test-docker.sh`：构建 → 运行 → healthz → SPA 回退 全链路验证 |

## 快速开始

```bash
# 构建
docker build -t myzubster-frontend -f frontend/Dockerfile frontend/

# 运行
docker run -d --name myzubster-frontend -p 8080:80 myzubster-frontend

# 访问
curl http://localhost:8080/            # SPA
curl http://localhost:8080/healthz     # 健康检查 -> {"status":"ok"}
```

## 环境变量

前端在 **构建时** 注入环境变量（Vite 会把 `VITE_*` 前缀的变量内联进产物，运行时无法修改）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_API_URL` | `/api` | 后端 API 基地址。同源部署用 `/api`，分离部署可传完整 URL |

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  -t myzubster-frontend frontend/
```

> 注意：仓库内 `frontend/.env.production` 中的 `REACT_APP_*` 变量是遗留配置，Vite 不会读取；如需要，请在 `.env.production` 中使用 `VITE_*` 前缀，或通过 `--build-arg` 传入。

## 健康检查

- 容器内置 `HEALTHCHECK`：每 30s 请求 `http://127.0.0.1/healthz`，3 次失败标记 unhealthy
- 编排工具（Compose / Swarm / K8s）可观察容器状态，也可直接探测 `/healthz`

```bash
docker inspect --format='{{.State.Health.Status}}' myzubster-frontend
# healthy
```

## 日志

nginx 配置将 access_log 与 error_log 输出到 stdout/stderr：

```bash
docker logs -f myzubster-frontend
# 172.17.0.1 - - [03/Aug/2026:...] "GET /healthz HTTP/1.1" 200 ...
```

无需额外配置即可接入 Docker / 云平台日志采集。

## Docker Compose 示例

```yaml
services:
  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: /api
    image: myzubster-frontend
    restart: unless-stopped
    ports:
      - "8080:80"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## 测试

```bash
cd frontend
./test-docker.sh
```

脚本执行 4 步验证，任一步失败即以非零退出码结束：

1. `docker build`（多阶段构建）
2. `docker run`（启动容器，端口默认 38080，可用 `TEST_PORT` 覆盖）
3. 轮询 `/healthz` 返回 200 且响应体包含 `"ok"`
4. 首页与 SPA 深层路由均返回 200（history 回退生效）

## 镜像优化说明

- **层缓存**：先复制 `package.json` + `package-lock.json` 并 `npm ci`，再复制源码 —— 依赖不变时构建秒级复用缓存
- **体积**：最终镜像仅含 nginx + 静态产物（约 25 MB），不含 node_modules 与构建工具链
- **静态缓存**：`/assets/` 下带内容哈希的文件设置 `Cache-Control: public, immutable` + 1 年过期
- **压缩**：gzip 对文本资源开启
- **构建上下文**：`.dockerignore` 排除 node_modules / dist / git 元数据，减小上下文传输
