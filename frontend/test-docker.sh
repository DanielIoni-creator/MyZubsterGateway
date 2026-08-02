#!/usr/bin/env sh
# MyZubster 前端 Dockerfile 验收测试
# 覆盖: 多阶段构建 / 健康检查 / SPA 回退
# 用法: cd frontend && ./test-docker.sh   (可用 TEST_PORT 覆盖默认端口)
set -eu

IMAGE="myzubster-frontend:test"
CONTAINER="myzubster-frontend-test"
PORT="${TEST_PORT:-38080}"

echo "==> [1/4] docker build (multi-stage)"
docker build -t "$IMAGE" --build-arg VITE_API_URL=/api .

echo "==> [2/4] docker run"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -p "127.0.0.1:${PORT}:80" "$IMAGE"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

echo "==> [3/4] wait for nginx + healthz"
code=""
for i in 1 2 3 4 5 6 7 8 9 10; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/healthz" || true)
    [ "$code" = "200" ] && break
    sleep 1
done
[ "$code" = "200" ] || { echo "FAIL: /healthz -> ${code:-no response}"; exit 1; }

body=$(curl -s "http://127.0.0.1:${PORT}/healthz")
echo "$body" | grep -q '"ok"' || { echo "FAIL: healthz body: $body"; exit 1; }
echo "    /healthz -> 200 $body"

echo "==> [4/4] SPA index + history fallback"
idx=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/")
[ "$idx" = "200" ] || { echo "FAIL: / -> $idx"; exit 1; }
spa=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/some/deep/route")
[ "$spa" = "200" ] || { echo "FAIL: SPA fallback /some/deep/route -> $spa"; exit 1; }

echo "PASS: all checks green (build, healthz, SPA fallback)"
