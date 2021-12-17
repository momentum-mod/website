# Momentum Mod Backend

## Dependencies
* [NodeJS (stable/LTS)](https://nodejs.org/en/download/)
* [Yarn](https://yarnpkg.com/en/)
* [MySQL](https://dev.mysql.com/downloads/mysql/)
* [Docker Compose V2+](https://docs.docker.com/compose/install/)

## Dev Setup
In the website directory copy the env.TEMPLATE to the same directory, rename it .env, and then add your configuration. Only STEAM_WEB_API_KEY needs to be updated for development. Open config.js in ./server/config to view default values for each environment.

From the website directory, run:
```
docker compose up -d
```
The initial database content will need to be created (tables, constraints, etc.). Run the force sync DB script to do so once the database container is initialized:
```
docker compose exec api node ../scripts/force_sync_db.js
```
Navigate to `http://localhost:3002/`. The app will automatically reload if you change any of the source files.

### Applying Database Updates
If updates or additions are made to the database design after you create the database tables for the first time, you will most likely have to apply these updates to your local databases. To do this, simply run docker-compose exec api node ../scripts/force_sync_db.js again to clear and recreate the initial database content.
## Swagger API Reference

Navigate to `http://localhost:3002/api-docs` to view the Swagger server API reference.

## Testing
The project utilizes [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) to run backend integration tests.

From the website directory, run:
```
docker compose -f docker-compose.yml -f docker-compose.test.yml -p test up -d
``` 

## Prod Setup
Copy the env.TEMPLATE file to .env, add your configuration, and set this variable:
```
NODE_ENV=production
```
From the website directory, run:
```
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
