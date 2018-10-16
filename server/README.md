# Getting Started

## Downloads

Download Node.js. Install the yarn package manager.

In the command line, navigate to this directory and type `yarn install` to install all project dependencies.

## Development server

For your database, run the following:

```
CREATE DATABASE momentum;
CREATE USER mom@localhost;
GRANT ALL PRIVILEGES ON momentum.* TO mom@localhost;
```

This will set up a simple test user for the database.

Run `nodemon server.js` for a development server. Navigate to `http://localhost:3002/`. The app will automatically reload if you change any of the source files.

Note that you can also run the server using `node server.js`, but it will not automatically reload if you change any of the source files.

## Swagger API Reference

Navigate to `http://localhost:3002/api-docs` to view the Swagger server API reference.

## Running tests

Run `npm test` to execute the tests via [Mocha](https://mochajs.org/).
