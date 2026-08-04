FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
<<<<<<< HEAD

EXPOSE 10000

=======
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001
ENV MONGODB_URI=mongodb://mongo:27017/myzubster
>>>>>>> e7f3bf96a (feat(docker): add Docker Compose dev environment and Dockerfile (B9))
CMD ["node", "server.js"]
