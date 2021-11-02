FROM node:12 as server

EXPOSE $NODE_PORT

WORKDIR /app/server

COPY /server/yarn.lock ./
COPY /server/package*.json ./
RUN yarn install

COPY server/. .

ENTRYPOINT ["node", "server.js"]
