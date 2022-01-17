FROM node:14 as Builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY prisma ./prisma/

# Install app dependencies
RUN npm install

COPY . ./

RUN npx prisma generate

FROM node:14

COPY --from=builder /app/. ./

EXPOSE 3002
CMD [ "npm", "run", "start:debug" ]
