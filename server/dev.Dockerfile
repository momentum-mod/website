FROM node:14-alpine as Builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY prisma ./prisma/

# Install app dependencies
# Should be faster than install 
# https://docs.npmjs.com/cli/v8/commands/npm-ci
RUN npm i

COPY . ./

RUN npx prisma generate

FROM node:14-alpine

COPY --from=builder /app/. ./

# Add docker-compose-wait tool -------------------
ENV WAIT_VERSION 2.7.2
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/$WAIT_VERSION/wait /wait
RUN chmod +x /wait

EXPOSE 3002
CMD [ "npm", "run", "start:migrate:debug" ]
