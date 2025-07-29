FROM node:lts

WORKDIR /app

RUN useradd --system --user-group --create-home backend

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
