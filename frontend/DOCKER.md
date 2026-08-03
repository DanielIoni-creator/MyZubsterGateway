# Docker for the MyZubster Frontend

Production-ready, multi-stage Docker setup for the React + Vite frontend
(`frontend/`). Built image = a tiny `nginx:alpine` runtime serving the static
bundle; the heavy Node toolchain is used only at build time.

- **Multi-stage build** (`node:20-alpine` → `nginx:1.27-alpine`) for a small,
  optimized final image.
- **Environment variables** injected at build time via build args.
- **Health check** exposed at `GET /healthz` (Docker `HEALTHCHECK`).
- **Logging** sent to stdout/stderr so `docker logs` / orchestrators work.
- **SPA fallback** so client-side routes (React Router) resolve correctly.

---

## 1. Build

From this directory (`frontend/`):

```bash
docker build -t myzubster-frontend:latest .
```

### Configure the backend endpoint

The app reads `import.meta.env.VITE_API_URL` (see `src/utils/axiosConfig.js`).
Pass it as a build arg so it is baked into the bundle:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.myzubster.example \
  -t myzubster-frontend:latest .
```

| Build arg            | Default | Description                                            |
| -------------------- | ------- | ------------------------------------------------------ |
| `VITE_API_URL`       | `/api`  | Base URL the frontend calls for API requests.          |
| `VITE_GATEWAY_URL`   | _(empty)_ | Optional gateway URL.                               |
| `VITE_BACKEND_URL`   | _(empty)_ | Optional backend URL.                                |
| `VITE_MONERO_ADDRESS`| _(empty)_ | Optional Monero address shown in the UI.             |
| `VITE_ENV`           | `production` | App environment label.                            |
| `VITE_VERSION`       | `1.0.0` | App version label.                                     |

> **Note:** With the default `VITE_API_URL=/api`, run this container **behind a
> reverse proxy** (nginx/Traefik/Caddy) that forwards `/api` to the backend, or
> set `VITE_API_URL` to the real backend origin. Static bundles cannot read
> env vars at runtime, so the URL must be known at build time.

---

## 2. Run

```bash
docker run -d --name mz-frontend -p 3000:8080 myzubster-frontend:latest
```

The app is now served on `http://localhost:3000` (container listens on `8080`
internally). Check it:

```bash
curl -fsS http://localhost:3000/healthz   # -> "ok"
curl -fsS -o /dev/null -w '%{http_code}\n' http://localhost:3000/
```

### Health status

```bash
docker inspect -f '{{.State.Health.Status}}' mz-frontend   # -> "healthy"
```

### Logs

```bash
docker logs -f mz-frontend
```

---

## 3. Run with Docker Compose (example)

```yaml
# docker-compose.yml
services:
  frontend:
    build:
      context: .
      args:
        VITE_API_URL: https://api.myzubster.example
    image: myzubster-frontend:latest
    ports:
      - "3000:8080"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

```bash
docker compose up -d --build
```

---

## 4. Acceptation tests

`test-docker.sh` builds the image and verifies:

- `GET /healthz` returns `200`
- `GET /` returns `200`
- a client-side route (e.g. `/some/spa/route`) falls back to `index.html` (`200`)
- the container reports `healthy`

```bash
bash test-docker.sh
```

---

## 5. Troubleshooting

| Symptom                                   | Fix                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------- |
| API calls return HTML instead of JSON    | Set `VITE_API_URL` to the backend origin, or proxy `/api` upstream. |
| `HEALTHCHECK` stays `starting`/`unhealthy`| Ensure port `8080` is the listening port; check `docker logs`.     |
| 404 on deep links after refresh           | Confirm the SPA `try_files` fallback is present in `nginx.conf`.    |
| `npm ci` fails                            | The committed `package-lock.json` is out of sync; this Dockerfile  |
|                                           | uses `npm install`, which reconciles it. Regenerate the lockfile   |
|                                           | locally (`npm install`) and commit it to switch back to `npm ci`.  |

---

## 6. Files

| File               | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `Dockerfile`       | Multi-stage build + runtime + healthcheck.         |
| `nginx.conf`       | Runtime server: SPA fallback, gzip, headers, logs. |
| `.dockerignore`    | Keeps the build context lean & secret-free.        |
| `DOCKER.md`        | This documentation.                                |
| `test-docker.sh`   | Local acceptance test.                             |
