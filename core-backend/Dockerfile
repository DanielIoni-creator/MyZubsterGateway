FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p data logs

EXPOSE 3000

CMD ["node", "app.js"]