FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001
ENV MONGODB_URI=mongodb://mongo:27017/myzubster
CMD ["node", "server.js"]
