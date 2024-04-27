FROM node:lts-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system backend && \
    adduser --system -G backend backend

COPY dist/apps/backend .
COPY libs/db/src/prisma/schema.prisma schema.prisma
RUN chown -R backend:backend .

RUN npm --omit=dev -f install
RUN node_modules/.bin/prisma generate --schema schema.prisma && rm schema.prisma

CMD [ "node", "main.js" ]
