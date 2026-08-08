# MyZubsterGateway — Deployment Guide

## Platform Options

| Platform | Complexity | Cost | Best For |
|----------|-----------|------|----------|
| Railway | Low | $5-20/mo | Quick deploys, auto-scaling |
| Render | Low | $7-25/mo | Managed MongoDB included |
| DigitalOcean App | Medium | $12-48/mo | Custom domains, team access |
| AWS Elastic Beanstalk | High | $15-100/mo | Enterprise, compliance needs |
| Self-hosted VPS | Medium | $5-30/mo | Full control, fixed cost |

## Deploy on Railway (Recommended)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize
railway init

# 4. Add MongoDB
railway add mongodb

# 5. Set environment variables
railway variables set \
  JWT_SECRET="$(openssl rand -hex 32)" \
  NODE_ENV=production

# 6. Deploy
railway up
```

## Deploy on Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub fork of `MyZubsterGateway`
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Environment**: Add `MONGODB_URI`, `JWT_SECRET`
4. Deploy — Render auto-deploys on every push to main

## Self-Hosted VPS (Ubuntu 22.04)

```bash
# 1. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod

# 3. Clone and deploy
git clone https://github.com/MyZubster-Ecosystem/MyZubsterGateway.git
cd MyZubsterGateway
npm ci --production

# 4. Configure env
cat > .env << 'EOF'
PORT=3000
MONGODB_URI=mongodb://localhost:27017/myzubster
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
EOF

# 5. PM2 process manager
npm i -g pm2
pm2 start src/server.js --name myzubster-gateway
pm2 save
pm2 startup
```

## Health Monitoring

### Endpoint Checks
```bash
# Health endpoint
curl -f https://your-domain.com/api/health || echo "DOWN"

# MongoDB connectivity
curl -f https://your-domain.com/api/health/db || echo "DB DOWN"
```

### Uptime Monitoring (Free)
- **UptimeRobot**: 50 monitors free, 5-min checks
- **Better Uptime**: 10 monitors free, heartbeat + SSL
- **Grafana Cloud**: 10k metrics free, Prometheus + Loki

### Logging
All requests are logged via Morgan (combined format). For production:
```bash
# Rotate logs with logrotate
cat > /etc/logrotate.d/myzubster << 'EOF'
/var/log/myzubster/*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
}
EOF
```

## SSL/TLS

### Option A: Cloudflare (Free)
1. Point DNS to Cloudflare nameservers
2. Enable proxy (orange cloud)
3. Set SSL/TLS to "Full (strict)"

### Option B: Caddy (Self-hosted)
```bash
sudo apt install -y caddy
cat > /etc/caddy/Caddyfile << 'EOF'
your-domain.com {
    reverse_proxy localhost:3000
}
EOF
sudo systemctl reload caddy
```

## Backup Strategy

### MongoDB Backups
```bash
# Daily cron
0 2 * * * mongodump --uri="$MONGODB_URI" --out=/backups/mongo/$(date +\%Y\%m\%d)
```

### Environment Backup
```bash
# Encrypt and store .env off-server
gpg -c .env  # Saves as .env.gpg
```

## Rollback Procedure

```bash
# PM2: revert to previous deployment
pm2 deploy ecosystem.config.js production revert 1

# Git: checkout last known good commit
git log --oneline -5
git checkout <commit-hash>
npm ci --production
pm2 restart myzubster-gateway
```
