FROM node:lts-slim

WORKDIR /app

RUN apt update && apt install curl jq -y
RUN useradd --system --user-group --create-home backend

COPY ./dist/apps/backend .
COPY ./libs/db/src/schema.prisma ./prisma/
COPY ./libs/db/src/migrations/ ./prisma/migrations/

RUN chown -R backend:backend .

USER backend
RUN npm --omit=dev --ignore-scripts install prisma@$(cat package.json | jq -r '.dependencies["@prisma/client"]')
RUN node_modules/.bin/prisma generate --schema ./prisma/schema.prisma

RUN rm package.json package-lock.json
COPY --chown=backend ./prod/backend/package.json .

CMD [ "npm", "run", "start" ]
