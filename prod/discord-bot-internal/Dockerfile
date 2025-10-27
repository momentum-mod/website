FROM node:lts-slim

WORKDIR /app

RUN useradd --system --user-group --create-home momman

COPY ./dist/apps/discord-bot-internal .
RUN chown -R momman:momman .

USER momman
RUN npm --omit=dev --ignore-scripts install

RUN rm package.json package-lock.json
COPY --chown=momman ./prod/discord-bot-internal/package.json .

CMD [ "npm", "run", "start" ]
