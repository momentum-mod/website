FROM node:12 as client

WORKDIR /app/client

COPY client/. .

RUN npm install -g @angular/cli && yarn install && npm run build:prod

FROM node:12 as server_build

WORKDIR /temp/server

COPY server/. .

RUN yarn install 
RUN npm run ts-build

FROM node:12 as server

EXPOSE $NODE_PORT

WORKDIR /app/server

COPY --from=server_build /temp/server/dist/out-tsc/ .

RUN rm -rf /temp/.

COPY --from=client /app/client/dist/ /app/server/public/

ENTRYPOINT ["node", "server.js"]
