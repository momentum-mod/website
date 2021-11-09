FROM node:12 as server_build

WORKDIR /temp/server

COPY server/. .

RUN yarn install 
RUN npm run ts-build

FROM node:12 as server

EXPOSE $NODE_PORT

WORKDIR /app/server

COPY --from=server_build /temp/server/node_modules node_modules
COPY --from=server_build /temp/server/dist/out-tsc/ .

ENTRYPOINT ["node", "server.js"]
