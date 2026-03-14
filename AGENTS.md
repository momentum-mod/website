# Momentum Mod Website — Agent Guide

## Architecture Overview

Nx monorepo (npm). All code is TypeScript.

- **`apps/backend`** — NestJS + Fastify REST API. Serves the game client and
  frontend.
- **`apps/frontend`** — Angular 20 SPA (standalone components, Tailwind +
  PrimeNG).
- **`apps/backend-e2e`** — Jest-based E2E tests that spin up the real NestJS
  app.
- **`apps/discord-bot-internal`** — Internal Discord bot (discord.js).
- **`libs/constants`** — Shared enums, model interfaces, query types, and
  constants used by both apps.
- **`libs/db`** — Prisma schema (`schema.prisma`), migrations, extended Prisma
  client, and raw TypedSQL queries (`src/sql/`).
- **`libs/enum`** — Use `Enum.values()`/`Enum.keys()` (from `@momentum/enum`)
  instead of `Object.values()`/`Object.keys()` on numeric enums due to
  TypeScript's reverse-mapping behaviour.
- **`libs/bitflags`** — Bitflag helpers. `Role` and `Ban` are bitflag enums; use
  `@momentum/bitflags` functions, not raw arithmetic.
- **`libs/test-utils`** — `DbUtil`, `RequestUtil`, `AuthUtil`, `FileStoreUtil`
  used in E2E tests.
- **`libs/formats/{zone,replay,bsp}`** — Game file parsers. `replay` is
  Node-only; do not import it from frontend.

Infrastructure: Postgres 18, Valkey 8 (Redis-compatible, via `iovalkey`), MinIO
(S3-compatible file storage).

## Developer Workflows

### Local setup

```sh
cp env.TEMPLATE .env          # fill in STEAM_WEB_API_KEY (only required value)
docker compose up -d          # starts Postgres, Valkey, MinIO
npx prisma migrate dev --config ./libs/db/src/prisma.config.ts
nx serve backend              # API on :3000
nx serve frontend             # SPA on :4200 (proxies API)
```

### Common Nx commands

```sh
nx serve backend              # dev with watch
nx test backend               # unit tests
nx e2e backend-e2e            # E2E tests (requires running infra)
nx lint frontend
nx run-many -t test           # all projects
```

### Database

The database schema is defined in `libs/db/src/prisma/schema.prisma`. This is
the single source of truth for database structure and should to determine
structure of all database interactions. Only use raw SQL if requested.

#### Migrations

```powershell
./create-migration.ps1 <migration-name>   # Windows
./create-migration.sh  <migration-name>   # Unix
```

Migrations live in `libs/db/src/migrations/`.

## Backend Patterns

### Injecting the database

The Prisma client is extended and injected via a symbol token, not as a typed
service class:

```ts
@Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
```

The extension adds `findManyAndCount()` and `exists()` to every model, and
auto-creates `profile`/`userStats` rows on `user.create`. Raw SQL lives in
`libs/db/src/sql/` and is called via
`this.db.$queryRawTyped(TypedSql.getFoo(...))`.

### Auth decorators

```ts
@BypassJwtAuth()          // public endpoint — skips JWT guard entirely
@LoggedInUser() user      // injects decoded JWT payload (id, steamID, gameAuth)
@LoggedInUser('id') id    // injects single field
@Roles(Role.ADMIN)        // combined with RolesGuard
```

`Role` and `Ban` are bitflag enums. Use `CombinedRoles` constants (e.g.
`CombinedRoles.MOD_OR_ADMIN`) rather than re-combining flags manually.

### DTOs

Transform Prisma results to DTOs using `DtoFactory`:

```ts
return DtoFactory(MapDto, prismaResult);
```

DTOs use compound decorators from `apps/backend/src/app/dto/decorators.ts` (e.g.
`NestedDto`, `EnumProperty`, `BigIntProperty`). Do not use raw `@ApiProperty` +
`@IsX` stacks when a compound decorator exists.

### Valkey

Run sessions (in-progress game runs) are stored in Valkey. Leaderboard rankings
are loaded from Postgres into Valkey sorted sets on startup
(`RankingService.onModuleInit`). The `KillswitchService` can disable features at
runtime without a redeploy.

## Frontend Patterns

All components are **standalone** with the `m-` prefix (e.g. `<m-map-list>`).
Routing uses lazy-loaded child route files (`routes.ts` /
`routes-user-facing.ts`).

`HttpService` (`apps/frontend/src/app/services/data/http.service.ts`) wraps
`HttpClient` for all backend calls. `LocalUserService` holds the current user as
a `BehaviorSubject<FullUser | null>`.

Import shared types from `@momentum/constants`, not from backend or Prisma
directly.

## Commit Convention

Conventional commits with a **required** scope:

```
feat(back): add replay download endpoint
fix(front): correct map status badge colour
refactor(db): simplify run query
```

Valid scopes: `front` `back` `back-e2e` `shared` `meta` `deps` `deps-dev` `db`
`xpsys` `utils` `scripts` `tools` `lint` `formats` `consts` `discord` `twitch`
`prod` `ci` `discord-internal`
