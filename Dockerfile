FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
FROM node:20-slim
RUN groupadd -r myzubster && useradd -r -g myzubster myzubster
WORKDIR /app
COPY --from=builder --chown=myzubster:myzubster /app/node_modules ./node_modules
COPY --from=builder --chown=myzubster:myzubster /app ./
EXPOSE 3000
USER myzubster
CMD ["node", "server.js"]
