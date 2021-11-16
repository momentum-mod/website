FROM node:12

WORKDIR /app/server

COPY . .

RUN yarn install --frozen-lockfile
RUN yarn global add nodemon ts-node

ENTRYPOINT ["nodemon", "server.ts", "--ext", "ts,json,js"]
