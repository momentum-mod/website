# AGENTS.md

Guidance for AI coding agents working in the Momentum Mod website monorepo.

## What this repo is

The web systems for [Momentum Mod](https://momentum-mod.org), a standalone
Source-engine movement game. Everything is TypeScript in an [Nx](https://nx.dev)
monorepo managed with **npm** (not pnpm/yarn). Node 24 is the CI baseline.

Four deployables plus shared libraries:

| Project                | Path                        | What it is                                                                 |
| ---------------------- | --------------------------- | -------------------------------------------------------------------------- |
| `frontend`             | `apps/frontend`             | Angular 20 dashboard site, deployed to Cloudflare Pages                    |
| `backend`              | `apps/backend`              | NestJS + Fastify REST API used by the game client and frontend             |
| `backend-e2e`          | `apps/backend-e2e`          | End-to-end suite against a real backend + in-memory Postgres + Valkey + S3 |
| `discord-bot-internal` | `apps/discord-bot-internal` | "Momentum Man" bot for the project's own Discord                           |
| `scripts`              | `scripts`                   | Seeding, admin promotion, zone generation, benchmarks                      |

Shared libraries in `libs/`, consumed via TS path aliases (see `tsconfig.json`):

- `@momentum/constants` — shared constants, roles, enums-as-values, map tags
- `@momentum/enum` — enum helper utilities
- `@momentum/bitflags` — bitflag join/has/remove helpers (roles, bans)
- `@momentum/db` — Prisma schema, migrations, generated client, extended client
- `@momentum/formats/{bsp,replay,zone}` — binary/game format parsers and writers
- `@momentum/random` — seeded random helpers
- `@momentum/util-fn` — generic utility functions
- `@momentum/xp-systems` — XP/level curve logic shared by backend and frontend
- `@momentum/test-utils` — shared test helpers (assertions, mocks, DB/S3/auth/
  request utils)

`libs/formats` and `libs/test-utils` are path-alias-only libraries without Nx
`project.json` build targets; the rest are Nx library projects.

## Stack

### Backend NestJS 11, Fastify platform, Prisma 7 against Postgres 18, Valkey 8

(`iovalkey`) for sessions/caching, S3-compatible object storage
(`@aws-sdk/client-s3`, RustFS locally), `ws` websockets, Steam OpenID plus app
tickets for auth, JWTs, and Sentry + pino for observability.

**Clustering.** `main.ts` reads `NEST_CLUSTER_NUM_PROCESSES` at startup. Unset,
`<= 1`, or `NaN` runs `startSingle()` (one process); anything higher runs
`startClustered()`, where the primary forks that many workers which share one
port via Node's `cluster` round-robin. Helpers live in
`apps/backend/src/clustered.ts`:

- `isFirstWorker()` is the "do this once per deployment" guard for scheduled and
  background work (currently `KillswitchService`, `MapListService`,
  `MapFeaturedService`). It is `NEST_WORKER_IS_PRIMARY !== 'false'`, so it
  defaults to **true** in single-process mode and in tests; the primary sets
  `'true'` on worker 0 and `'false'` on the rest.
- Workers cannot message each other. `sendClusterMessage()` sends a
  `ClusterMessageType.PubSub` message up to the primary, and
  `initalizeClusterMessaging()` (sic, the name is misspelled in source) fans it
  out to every worker, including the sender. It must be called on the primary in
  both modes.
- `WebsocketService.dispatch` uses this: a user's socket lives on one worker but
  the broadcast may originate on another, so in a worker it round-trips via the
  primary, while in single mode it delivers locally. Any new per-worker
  in-memory state has the same problem, which is why killswitch state lives in
  Valkey rather than memory.
- If any worker exits, the primary calls `process.exit(1)` so Docker restarts
  everything; `uncaughtException` does the same.

### Frontend Angular 20 standalone components, Tailwind 3, PrimeNG 20,

Chart.js. The theme pulls in a git submodule at
`apps/frontend/src/app/theme/shared_styling` — clone with `--recursive` or run
`git submodule update --init`.

## Layout conventions

Backend follows standard Nest structure under `apps/backend/src/app`:
`modules/<feature>/` each containing `<feature>.module.ts`,
`<feature>.controller.ts`, one or more `*.service.ts`, plus colocated
`*.test.ts`. Cross-cutting pieces live in sibling directories: `config/`,
`dto/`, `decorators/`, `filters/`, `interceptors/`, `pipes/`, `validators/`.
`main.ts` is the entry point (it picks single or clustered mode itself),
alongside `clustered.ts` (cluster helpers), `instrumentation.ts` (OTel
bootstrap, which must be imported first) and `repl.ts`.

Frontend is organized by `pages/`, `components/`, `services/`, `guards/`,
`interceptors/`, `pipes/`, `directives/`, `validators/`, and `util/`, with
routing in `app.routes.ts` and environment files under `env/`.

## Testing — Node's built-in runner

All unit and E2E tests use the Node.js built-in test runner (`node --test`) with
`node:assert/strict`. Every test file ends in `.test.ts`; there are no
`.spec.ts` or `.e2e-spec.ts` files. Do not introduce Jest globals (`expect`,
`jest.fn`, `jest.mock`) or Jest config.

Write tests like this:

```ts
import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, mock } from 'node:test';
```

For assertions and mocks that `node:assert` does not cover, use the shared
helpers from `@momentum/test-utils` rather than writing local copies:

- `node-test-assert.util.ts` — `matchesPartial` (like `toMatchObject`),
  `matchesExact` (like `toEqual`), `includesPartial`, `wasCalledWith` (exact,
  like `toHaveBeenCalledWith`), `objectContaining`, `arrayContaining`,
  `stringContaining`
- `node-mock.util.ts` — `mockDeep`, `resetDeepMockCalls`, `resetMockCalls`,
  `mockImplementationOnce`, `spyOnNestedMethod`

Nest unit tests typically build a `TestingModule` with `.useMocker(mockDeep)`
and `PRISMA_MOCK_PROVIDER` from `apps/backend/test/prisma-mock.const.ts`.

E2E tests are preferred to testing complex logic involving Postgres and Valkey;
superfluous unit tests should be avoided. E2E tests run against a real NestJS
app, an in-memory Postgres (PGlite), Valkey, and S3, and are seeded with a known
state. Use `registerE2ETestFile()` at the top of each E2E test file's root
`describe` to get consistent Faker seeding and per-file cleanup of database,
Valkey, and S3 state. See `apps/backend-e2e/src/support/e2e-environment.ts` for
details.

### Running tests

```bash
npx nx run backend:test         # backend unit tests
npx nx run frontend:test        # frontend unit tests
npx nx run util-fn:test         # a library's tests (also bitflags, enum, xp-systems)
npx nx run backend-e2e:e2e      # full E2E suite (needs valkey + rustfs up)
npx nx run backend-e2e:watch    # E2E in watch mode
npx nx run constants:test-types # type-level test build
```

Each `test` target shells out to `node --test --test-reporter=spec` with
`ts-node/register` and `tsconfig-paths/register`. The explicit spec reporter is
deliberate — it keeps CI off Node's default TAP output. Backend tests
additionally preload `reflect-metadata` and `apps/backend/test/test-setup.ts`,
which installs `BigInt.prototype.toJSON` so DTO assertions serialize BigInts the
same way the API does. Frontend tests preload `apps/frontend/src/test-setup.ts`,
which builds a JSDOM document, installs the browser globals Angular expects, and
initializes `TestBed` with zoneless change detection. The app is zoneless and
zone.js is not installed, so zone-based helpers like `fakeAsync` are
unavailable. Projects select their own `tsconfig.spec.json` via
`TS_NODE_PROJECT`, with `TS_NODE_TRANSPILE_ONLY=true` on backend and E2E.

### The E2E suite is one shared process per worker

`apps/backend-e2e/run-tests.ts` splits the E2E files (balanced by file size)
across workers, each a Node test process with `--test-concurrency=1` that
preloads `src/support/e2e-setup.ts` and uses `test-file-loader.cjs` as the entry
point. The loader sorts and imports that worker's `.test.ts` files into **one
process**, so there is one module cache and one live NestJS application for all
the worker's files instead of a fresh app per file.

`src/support/e2e-environment.ts` compiles the backend `AppModule`, configures
Fastify, validation and serialization, and installs a WebSocket adapter on a
real ephemeral port. It exports `prisma`, `req`, `db`, and
`registerE2ETestFile()` — call `registerE2ETestFile()` at the top of each file's
root `describe` to get consistent Faker seeding and per-file cleanup of
database, Valkey, and S3 state.

Important consequence: **state is not reset between individual tests.** A test
that mutates shared state must clean it up itself, commonly
`await db.cleanup('user')` in an `after` hook. Isolation is file-level only.

`MOMENTUM_E2E_TEST_FILES` can hold a JSON array to load a subset of files; the
Nx full-suite target clears it.

## Local development

Copy `env.TEMPLATE` to `.env` at the repo root. Only `STEAM_WEB_API_KEY` is
strictly required; the rest have sensible dev defaults.

```bash
npm ci
npx nx run db:generate     # prisma db push + generate — needed before most builds
docker compose up -d       # postgres, valkey, rustfs, bucket creation
npx nx run db:deploy       # apply migrations
npx nx run db:seed
npx nx run backend:serve
npx nx run frontend:serve  # proxies to the backend via proxy.conf.json
```

Generated Prisma output lives in `libs/db/src/generated` and is not committed,
so `db:generate` must run before builds, type checks, and tests on a fresh
clone.

Other `db` targets: `db:format`, `db:create-migration`, `db:studio`, and
`db:reset` (migrate reset plus `valkey-cli flushall`). Script targets:
`scripts:seed`, `scripts:makemeadmin`, `scripts:generate-zones`,
`scripts:maptags-poeditor`, `scripts:scratchpad`, `scripts:bench-run-ranks`.

E2E in Docker, the way CI runs it:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml run backend-e2e
```

## Code style and conventions

- Prettier is authoritative: 80 columns, single quotes, no trailing commas,
  semicolons, 2-space indent, LF, `proseWrap: always` (so wrap Markdown too).
  HTML uses the Angular parser at 140 columns with the Tailwind class-sorting
  plugin. Run `npx nx format:write`; CI runs
  `nx format:check --base=origin/main`.
- ESLint (flat config in `eslint.config.mjs`) layers Nx's TS/JS configs with a
  curated `unicorn` set and `unused-imports`. Notable local choices:
  `no-explicit-any` and `no-non-null-assertion` are **off**;
  `@typescript-eslint/no-unused-vars` is off in favour of
  `unused-imports/no-unused-vars` with a `^_` ignore pattern, so prefix
  intentionally unused bindings with `_`.
- `@nx/enforce-module-boundaries` is enforced by tag: `frontend`-tagged code may
  not import `@nestjs/common`, `@prisma/client`, or `@momentum/db`;
  `backend`-tagged code may not import `@angular/core`. Respect this when
  deciding where shared code belongs — if both sides need it, it goes in
  `libs/`.
- Nx generator defaults: Angular components are standalone, prefix `m`, no
  generated spec file, `style: none`.
- Commits are conventional and **commitlint-enforced with a closed scope list**
  — a scope is mandatory. Types:
  `build chore ci docs feat fix perf refactor revert style test tmp`. Scopes:
  `front`, `back`, `back-e2e`, `shared`, `meta`, `deps`, `deps-dev`, `db`,
  `xpsys`, `utils`, `scripts`, `tools`, `lint`, `formats`, `consts`, `discord`,
  `twitch`, `prod`, `ci`, `discord-internal`. Keep subjects lower case. Example:
  `fix(back): don't 500 on missing map zones`.
- A husky `pre-commit` hook runs `lint-staged`, which only runs
  `nx format:write` on staged files — ESLint is deliberately kept out of the
  hook because it is too slow. Run lint yourself before pushing.
- Don't add speculative logging. Nobody reads logs for things that aren't
  broken: either handle an error properly, or deliberately swallow it with a
  comment saying why. Serious errors are what Sentry is for, not log lines.

## CI

`.github/workflows/test.yml` ("Code Quality") runs on PRs to `main` on Node 24:
an `install-deps` job primes the `node_modules` and Prisma caches, then parallel
jobs run `lint` (commitlint + Prettier + `nx affected --target=lint`), `test`
(`nx affected --target=test`), `build` (`nx affected --target=build`),
`type-test` (`constants:test-types`), and `backend-e2e`, which only runs when Nx
reports `backend-e2e` as affected and then executes the suite via Docker
Compose.

Deploy workflows: `backend_docker_image.yml` and
`discord_bot_internal_docker_image.yml` publish images to ghcr.io from the
Dockerfiles under `prod/`; `frontend_cf_pages.yml` publishes to Cloudflare
Pages; `staging.yml` chains these on pushes to `main`.

Nx Cloud is disabled entirely.

## Notes and gotchas

### Models, DTOs, and the Prisma schema

Data passes through three layers, and they must stay in agreement:

1. **`libs/db/src/schema.prisma`** is the source of truth for storage. Prisma 7
   with the `prisma-client` generator, `engineType = "client"` (driver adapter
   `@prisma/adapter-pg`) and the `typedSql` preview feature; raw queries live in
   `libs/db/src/sql`. Output goes to the uncommitted `libs/db/src/generated`.
   `extended-client.ts` adds `findManyAndCount` and `exists` to every model, and
   makes `user.create` also create `profile` and `userStats`.
2. **`libs/constants/src/types/models/models.ts`** holds the _models_: plain
   TypeScript interfaces describing the JSON shapes of the API. They import
   nothing from Prisma, so the frontend and the game client (Panorama) can use
   them. Never import Prisma types into a model or into frontend code.
3. **Backend DTO classes** in `apps/backend/src/app/dto/` `implements` a model
   (e.g. `UserDto implements User`) and add the class-validator,
   class-transformer and Swagger decorators.

`prisma-correspondence.ts` (same directory as `models.ts`) ties 1 and 2 together
at compile time with `assertTypeCorrespondence<Model, PrismaModel, Mapping>()`.
The mapping lists fields whose type differs (`steamID: string`,
`totalJumps: number`), fields to drop (`OmitMe`, e.g. foreign keys or `avatar`)
and fields that become optional (`MakeOptional`). `Date` becomes `DateString`
automatically. **If you change the schema and this file stops compiling, fix it;
every new table needs an entry.** Changing a model usually means touching all
three layers.

How DTOs behave at runtime:

- Build them with `DtoFactory(Type, input)` from `dto/functions.ts`. It is
  `plainToInstance` with `ignoreDecorators: true`, so it just copies fields;
  decorator transforms run later when the instance is serialized.
- `main.ts` installs a global `ClassSerializerInterceptor`, which applies those
  transforms (and `@Exclude`/`@Expose`) on the way out, and a global
  `ValidationPipe(VALIDATION_PIPE_CONFIG)` for inputs: `transform`, `whitelist`,
  `forbidNonWhitelisted`, `forbidUnknownValues`. Unknown properties in a request
  body are rejected, not stripped.
- Prefer the composite decorators in `dto/decorators.ts` (`IdProperty`,
  `NestedProperty`, `EnumProperty`, `CreatedAtProperty`, the `*QueryProperty`
  family, `SafeBigIntToNumber`) over stacking raw decorators; they set
  validation, Swagger docs and transforms together.
- Computed or renamed fields use `@Exclude({ toPlainOnly: true })` on the raw
  field plus an `@Expose()` getter, e.g. `avatar` becoming `avatarURL`.
- `JsonifiableDto` exists for models with `JsonValue` index signatures.
- E2E and unit tests validate responses with `assertValidDto` /
  `assertValidPagedDto` from `@momentum/test-utils`.
- Number/BigInt should be used with care. Several Postgres tables use int64
  columns, which Prisma returns as `bigint`, however during class-transformer's
  JSON serialization we usually coerce to `number` using `@SafeBigIntToNumber()`
  or `@IdProperty({ bigInt: true })` decorators, for values expected to be small
  enough to fit in a JS number. In other cases, we stringify using a
  `BigInt.prototype.toJSON` shim (installed in app code and in the backend test
  setup).
