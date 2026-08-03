#!/usr/bin/env bash
#
# Acceptance test for the MyZubster frontend Docker image.
# Builds the image, runs the container, and asserts:
#   - GET /healthz            -> 200
#   - GET /                   -> 200
#   - GET /<spa-route>        -> 200  (SPA fallback to index.html)
#   - container reports healthy
#
set -euo pipefail

IMAGE="myzubster-frontend:test"
CONTAINER="mz-frontend-test"
PORT=8080

# Pick an HTTP client available on the host
if command -v curl >/dev/null 2>&1; then
  http() { curl -fsS "$@"; }
  code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
elif command -v wget >/dev/null 2>&1; then
  http() { wget -qO- "$@"; }
  code() { wget -q -S -O /dev/null "$@" 2>&1 | awk '/HTTP\//{print $2}' | tail -1; }
else
  echo "ERROR: neither curl nor wget is available" >&2
  exit 1
fi

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> Building image $IMAGE"
docker build -t "$IMAGE" .

echo "==> Starting container on port $PORT"
docker run -d --name "$CONTAINER" -p "$PORT:$PORT" "$IMAGE"

echo "==> Waiting for /healthz to respond"
for _ in $(seq 1 30); do
  if code "http://localhost:$PORT/healthz" | grep -q 200; then
    break
  fi
  sleep 1
done

echo "==> Running assertions"
fail=0

if [ "$(code "http://localhost:$PORT/healthz")" = "200" ]; then
  echo "PASS  /healthz -> 200"
else
  echo "FAIL  /healthz"; fail=1
fi

if [ "$(code "http://localhost:$PORT/")" = "200" ]; then
  echo "PASS  / -> 200"
else
  echo "FAIL  /"; fail=1
fi

if [ "$(code "http://localhost:$PORT/some/spa/route")" = "200" ]; then
  echo "PASS  SPA fallback (/some/spa/route) -> 200"
else
  echo "FAIL  SPA fallback"; fail=1
fi

echo "==> Container health status"
docker inspect -f '{{.State.Health.Status}}' "$CONTAINER"

if [ "$fail" -ne 0 ]; then
  echo "RESULT: FAILED"
  exit 1
fi

echo "RESULT: ALL TESTS PASSED"
