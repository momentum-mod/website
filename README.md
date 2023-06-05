![Momentum Mod Logo](apps/frontend/src/assets/images/logo.svg)

> _Momentum Mod is a standalone game built on the Source Engine, aiming to
> centralize movement gamemodes found in CS:S, CS:GO, and TF2._

# Introduction

This is the repository for the major web systems used by
[Momentum Mod](https://momentum-mod.org).

Its central components are the web frontend and the HTTP backend. The frontend
is a dashboard site that acts as a central hub for and an extension to the
[game client](https://github.com/momentum-mod/game), allowing players to log in
via (OpenID), where they can see edit their profile, submit maps, see additional
statistics, and more.

The backend of the website is a REST HTTP API used primarily by the game client
and frontend, handling database and file storage, and providing much of Momentum
Mod's core functionality, such as map uploads/downloads, run submission/viewing,
and stats congregation/filtering.

# Architecture

The vast majority of the codebase is written in
[Typescript](https://www.typescriptlang.org/). It's structured as an
[integrated monorepo](https://nx.dev/concepts/integrated-vs-package-based#integrated-repos)
using [Nx](https://nx.dev) as a build system - in simple terms this means we
have a single `package.json` for Node dependencies, and use the `nx` CLI tool
(or editor plugins) for everything build-related. We use npm as our package
manager.

The frontend runs on [Angular](https://angular.io) and uses the
[Nebular](https://github.com/akveo/nebular) component library.

The backend runs on [NodeJS](https://nodejs.org/) with
[NestJS](https://nestjs.com/) handling architecture and routing, and
[Fastify](https://www.fastify.io/) as the underlying HTTP server. It uses
[Prisma](https://www.prisma.io/) as an ORM with
[Postgres](https://www.postgresql.org/) as the underlying database.

# Contributing

Momentum Mod is developed entirely by volunteers, thus we are very happy to
accept any contributions.

To get started check out the
[setup guide](https://github.com/momentum-mod/website/wiki/Setup), as well 
as the rest of the wiki.

## Guidelines

### Linting/Formatting

