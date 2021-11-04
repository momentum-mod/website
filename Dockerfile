FROM node:12 as server_build

WORKDIR /temp/server

COPY server/. .

RUN yarn install 
RUN npm run ts-build

FROM node:12 as server

EXPOSE $NODE_PORT

WORKDIR /app/server

COPY --from=server_build /temp/server/dist/out-tsc/ .

COPY server/public/. .

RUN rm -rf /temp/.

ENTRYPOINT ["node", "server.js"]
