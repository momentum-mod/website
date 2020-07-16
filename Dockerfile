FROM node:12 as client

WORKDIR /app/client

COPY client/. .

RUN npm install -g @angular/cli && yarn install && npm run build:prod

FROM node:12 as server

EXPOSE $NODE_PORT

WORKDIR /app/server

COPY /server/package*.json ./
RUN yarn install

COPY server/. .

COPY --from=client /app/client/dist/* /app/server/public/

ENTRYPOINT ["node", "server.js"]
