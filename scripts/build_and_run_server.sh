#!/bin/bash

cd ../client
yarn install
npm run build:prod
cd ../server
yarn install
mv ../client/dist/* ./public/
source ~/exports
node server.js