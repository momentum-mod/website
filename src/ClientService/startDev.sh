#!/bin/bash

cd ClientApp
npm install -g @angular/cli
yarn install

ng serve --proxy-config proxy.conf.json --host 0.0.0.0