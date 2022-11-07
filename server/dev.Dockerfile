FROM node:18-alpine as Builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY prisma ./prisma/

# Install app dependencies - should be faster than install 
# https://docs.npmjs.com/cli/v8/commands/npm-ci
RUN npm i 

COPY . .

RUN npx prisma generate

FROM node:18-alpine

COPY --from=builder /app/. ./