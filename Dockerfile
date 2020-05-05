FROM node:12

EXPOSE $NODE_PORT

WORKDIR /app/client

COPY client/. .

RUN npm install -g @angular/cli && yarn install && npm run build:prod

WORKDIR /app/server

COPY /server/package*.json ./
RUN yarn install

COPY server/. .

RUN mkdir /app/server; mkdir /app/server/public; mv -vf /app/client/dist/* /app/server/public/

ENTRYPOINT ["node", "server.js"]