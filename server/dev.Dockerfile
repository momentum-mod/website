FROM node:12

WORKDIR /app/server

COPY . .

RUN yarn install --frozen-lockfile
RUN yarn global add nodemon ts-node

ENTRYPOINT ["npm", "run", "dev"]
