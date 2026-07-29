FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production || npm install --production

COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]
