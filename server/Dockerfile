FROM node:12 as server

EXPOSE $NODE_PORT

RUN npm install -g nodemon --unsafe-perm

WORKDIR /app/server

COPY ./yarn.lock ./
COPY ./package*.json ./
RUN yarn install

COPY . .

ENTRYPOINT ["nodemon", "server.js"]
