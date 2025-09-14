FROM node:lts-alpine

WORKDIR /app

RUN apk add curl
RUN addgroup -S backend && adduser -S backend -G backend

COPY ./dist/apps/backend .
COPY ./libs/db/src/schema.prisma ./prisma/
COPY ./libs/db/src/migrations/ ./prisma/migrations/

RUN chown -R backend:backend .

USER backend
RUN npm --omit=dev --ignore-scripts install
RUN node_modules/.bin/prisma generate --schema ./prisma/schema.prisma
RUN mv prisma/generated/libquery_engine* .

RUN rm package.json package-lock.json
COPY --chown=backend ./prod/backend/package.json .

CMD [ "npm", "run", "start" ]
