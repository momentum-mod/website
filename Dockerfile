<<<<<<< HEAD
FROM node:12 as client

WORKDIR /app/client

COPY client/. .

RUN npm install -g @angular/cli && yarn install && npm run build:prod

FROM node:12 as server_build

WORKDIR /temp/server

COPY server/. .

RUN yarn install 
RUN npm run ts-build

=======
>>>>>>> staging
FROM node:12 as server

EXPOSE $NODE_PORT

WORKDIR /app/server

<<<<<<< HEAD
COPY --from=server_build /temp/server/dist/out-tsc/ .
=======
COPY /server/yarn.lock ./
COPY /server/package*.json ./
RUN yarn install
>>>>>>> staging

RUN rm -rf /temp/.

ENTRYPOINT ["node", "server.js"]
