# Momentum Mod Backend

_**Note: The NestJS rewrite is currently in development, and major parts are likely to change regularly.
Potential contributors should contact us in the #website change on our [Discord server](discord.gg/momentummod).**_

_**It is not recommended that you start work on this branch without first discussing with other contibutors in Discord.**_

**TODO: General intro to backend architecture.**

## Dependencies
* [Docker Compose V3.8+](https://docs.docker.com/compose/install/)
* [NodeJS (stable/LTS)](https://nodejs.org/en/download/) (Optional, only for native Node mode)

## Developer Setup
### Environment Variables
In the website directory copy the env.TEMPLATE to the same directory, rename it .env, and then add your configuration.

Only STEAM_WEB_API_KEY needs to be updated for basic development.

Docker will expose the ports of several containers, if using the default passwords in the env.TEMPLATE file, be careful
of any open ports.

### Running the API

We provide two ways to get the API up and running.
1) Entirely Dockerized, the fastest way to get up and running, and best for frontend developers.
2) Running Node natively. This is easier to interact with and debug, recommended for backend developers.

In both cases, we use Docker to create [MySQL](https://www.mysql.com/) and [MinIO](https://min.io/) containers. You *can*
set up native MySQL and MinIO instances if you want, but Docker makes things considerably easier.

#### Dockerized
From the `website` directory, run:
```
docker compose --profile full up -d
```
This will build and start the MySQL, MinIO and main API containers.

To override the NPM script we run to start up the API, set the CMD variable, e.g. to first seed the DB with mock data:
```
CMD=start:seed docker compose --profile full up -d
```

#### Local Node
From the `website` directory, run:
```
docker compose up -d
```
This will build and start only the MySQL, MinIO containers.

Then, `cd` into the `website/server` directory, and run the NPM scripts you want,
for example to have Prisma initialise the DB and the start the Node app, use
```
npm run start:push
```

### Interacting with the API
Once you have everything running (by either method), the Swagger docs will be available at `http://localhost:3000/api-docs`.

The majority of the API is locked behind auth, so to query endpoints through Swagger (or cURL, Hoppscotch, Postman etc.)
you'll need a Steam auth token. Go to http://localhost:3000/auth/steam/, login through Steam, then grab `access_token` value.
Then use in the "Authorize" dialogue, or as the bearer token in cURL, Hoppscotch etc.

## Testing

The `test` scripts and its variations will run our end-to-end tests, and can be used to query the API much more
conveniently during development, as Jest can be used to create users internally and set an access token without using
Steam. You can then run individual tests using `-t`, or ideally, use a plugin for your text editor/IDE to manage tests,
so you can query the endpoints you're currently working on in isolation.

In the future we'll provide a more robust testing setup using the docker-compose.test.yml file, probably when we implement
CI. Until then, the most practical way of running tests is to use the Local Node approach and run through npm scripts or an IDE.

## Contribution Guidelines

