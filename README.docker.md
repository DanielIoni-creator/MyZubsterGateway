# Docker Deployment Guide

## Quick Start
```bash
cp .env.example .env
# Edit .env with your values (especially JWT_SECRET)
docker-compose up -d
docker-compose ps
```

## Services
| Service | Port | Description |
|---------|------|-------------|
| gateway | 3000 | Main API + web interface |
| biodiversity-ml | 5000 | ML biodiversity analysis |
| websocket | 8080 | Real-time WebSocket server |
| mongo | 27017 | MongoDB database |
| redis | 6379 | Redis cache + queue |

## Commands
```bash
docker-compose up -d          # Start all
docker-compose down           # Stop all
docker-compose logs -f SVC    # View logs
docker-compose up -d --build  # Rebuild
docker-compose down -v        # Clean restart
```

## Production Notes
- Set JWT_SECRET to a strong random value
- Use managed MongoDB/Redis in production
- Enable Docker content trust: export DOCKER_CONTENT_TRUST=1
- Set up log aggregation (ELK, Datadog)
