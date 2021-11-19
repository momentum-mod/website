FROM node:12 as server_build

WORKDIR /temp/server

COPY . .

RUN yarn install 
RUN npm run ts-build

FROM node:12 as server

EXPOSE 3002

WORKDIR /app/server

COPY --from=server_build /temp/server/node_modules node_modules
COPY --from=server_build /temp/server/dist/out-tsc/ .

ENTRYPOINT ["node", "server.js"]
