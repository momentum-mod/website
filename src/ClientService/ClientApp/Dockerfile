FROM node:12 AS client

EXPOSE 4200

USER node

RUN mkdir /home/node/.npm-global

ENV PATH=/home/node/.npm-global/bin:$PATH
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

RUN npm install -g @angular/cli

WORKDIR /app

COPY /src/ClientService/ClientApp/startDev.sh .

CMD chmod +x startDev.sh

ENTRYPOINT ["bash", "startDev.sh"]
