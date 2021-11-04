FROM node:12 as server

EXPOSE $NODE_PORT

WORKDIR /app/server

COPY ./yarn.lock ./
COPY ./package*.json ./
RUN yarn install

COPY . .

ENTRYPOINT ["node", "server.js"]
