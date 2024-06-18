FROM node:lts-alpine

WORKDIR /app

RUN addgroup --system backend && \
    adduser --system -G backend backend

COPY ../dist/apps/backend .
COPY ../libs/db/src/prisma/ ./prisma/

RUN chown -R backend:backend .

RUN npm --omit=dev --ignore-scripts install
RUN node_modules/.bin/prisma generate --schema ./prisma/schema.prisma

RUN rm package.json package-lock.json
COPY ./prod/package.json .

USER backend
CMD [ "npm", "run", "start" ]
