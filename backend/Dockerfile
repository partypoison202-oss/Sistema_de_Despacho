FROM node:20-alpine

WORKDIR /usr/src/app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts

COPY --chown=node:node . .

USER node

EXPOSE 4000

CMD ["node", "src/server.js"]
