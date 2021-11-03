# Momentum Mod Backend

## Dependencies
* [NodeJS (stable/LTS)](https://nodejs.org/en/download/)
* [Yarn](https://yarnpkg.com/en/)
* [MySQL](https://dev.mysql.com/downloads/mysql/)

## Docker Setup
From the website directory, run:
```
docker compose up -d
```
On first run, setup the database:
```
docker exec website_api_1 node ../scripts/force_sync_db.js
```
Restart the api and you are good to go:
```
docker restart website_api_1
```
## Packages

In the command line, navigate to this directory and run
```
yarn install
``` 
to install all project packages.

## Running a Development Server

### Set up the Database
For your database, run the following:

```
CREATE DATABASE momentum;
CREATE USER mom@localhost;
GRANT ALL PRIVILEGES ON momentum.* TO mom@localhost;
```

This will set up a simple test user for the database. You only need to do this once.

Next, the initial database content will need to be created (tables, constraints, etc.). Run the force sync DB script in the scripts folder to do so:

```
node <path-to-file>/force_sync_db.js
```

#### Applying Database Updates

If updates or additions are made to the database design after you create the database tables for the first time, you will most likely have to apply these updates to your local databases. To do this, simply run the force_sync_db.js script again to clear and recreate the initial database content.

### Run the Backend

To start the backend, run:
```
nodemon server.js
```
for a development server. Navigate to `http://localhost:3002/`. The app will automatically reload if you change any of the source files.

>*Note that you can also run the server using `node server.js`, but it will not automatically reload if you change any of the source files.*

## Swagger API Reference

Navigate to `http://localhost:3002/api-docs` to view the Swagger server API reference.

## Testing
The project utilizes [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) to run backend integration tests.

### Set the NODE_ENV environment variable
You will need to set the environment variable:
```
NODE_ENV=test
```
before being able to run any of these tests. Most IDEs let you specify them before running the script.

### Set up Testing Database
In your MySQL command line, run:
```
CREATE DATABASE momentum_test;
CREATE USER mom_test@localhost;
GRANT ALL PRIVILEGES ON momentum_test.* TO mom_test@localhost;
```

To set up the testing database tables, follow the normal database table set up seen above while making sure to set the NODE_ENV environment variable beforehand (as seen in the testing setup instructions above).

### Run the Tests
To run the tests, run:
```
npm test
```
in this directory.
