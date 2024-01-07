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
using [Nx](https://nx.dev). We use npm as our package manager.

The frontend runs on [Angular](https://angular.io) 17. We use
[Tailwind](https://tailwindcss.com/) for most styling,
[PrimeNG](https://primeng.org/) for some components.

The backend runs on [NodeJS](https://nodejs.org/), with

- [NestJS](https://nestjs.com/): handling architecture and routing,
- [Fastify](https://www.fastify.io/): the underlying HTTP server,
- [Prisma](https://www.prisma.io/): an ORM,
- [Postgres](https://www.postgresql.org/): the underlying database

# Contributing

Momentum Mod is developed entirely by volunteers, so we're always on the lookout
for more contributors! If you want to get involved, we highly recommend joining
our [Discord](https://discord.gg/momentummod) and letting us know. Whilst you
_could_ just work off of the open issues board, it's much easier for us to
organize if we know who is working on what, and can make sure there's no
overlap.

To get started check out the
[setup guide](https://github.com/momentum-mod/website/wiki/Setup), as well as
the rest of the [wiki](https://github.com/momentum-mod/website/wiki). The
majority of information about this repo lives on the wiki!

Please see our
[contribution guidelines](https://github.com/momentum-mod/website/wiki/Contribution-Guidelines)
before making a pull request.

# Bug Reports

If you've found a problem with the website, please
[open an issue](https://github.com/momentum-mod/website/issues/new/choose)!
