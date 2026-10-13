# Lobby and run session load tests

Load and concurrency tests for the game WebSocket's lobby tracking
(`LobbyService`) and run sessions (`RunSessionService`), run against a real
clustered backend. Results are in [RESULTS.md](RESULTS.md), raw output in
[results/](results).

## Safety

Everything runs against **throwaway containers on non-default ports**
(Postgres 55432, Valkey 56379, MinIO 59000) and a backend on **:3100**. Every
script sources [env.sh](env.sh) and refuses to run unless it points there, so
the dev database, Valkey and storage can't be touched. The race tests flush the
isolated Valkey (`race.mjs flush`) and the e2e harness wipes the isolated
database, which is fine because it's all disposable.

## Files

| File                          | What it is                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `stack.sh up\|down`           | Start (migrate + seed) or stop the isolated containers                        |
| `start-backend.sh <workers>`  | Run a copied backend bundle on :3100, clustered unless `<workers>` is 1       |
| `env.sh`                      | Environment for the above, and the isolation check                            |
| `seed.sql`                    | A map with leaderboards, which run sessions need                              |
| `common.mjs`                  | WebSocket client, JWT minting, Valkey invariant checker                       |
| `lt.mjs`                      | Lobby load test: forks client processes, samples Valkey and backend CPU       |
| `race.mjs`                    | Lobby concurrency tests                                                       |
| `rs-race.mjs`                 | Run session WebSocket concurrency and load tests                              |
| `http-upload-race.e2e-spec.ts`| Run session replay upload races (needs the e2e harness, see below)            |
| `fmt.py`                      | Summarises `lt.mjs` output                                                    |

Clients don't need database users: `common.mjs` mints game JWTs with the
isolated `JWT_SECRET` for fixed user ID ranges per test.

## Running

From the repo root, in Git Bash:

```bash
lobby-loadtest/stack.sh up

# A stable copy of the backend, so `nx serve` rebuilding dist can't change it mid-test
npx nx build backend
mkdir -p lobby-loadtest/backend && cp dist/apps/backend/main.js* lobby-loadtest/backend/

lobby-loadtest/start-backend.sh 4 &   # 4 cluster workers
. lobby-loadtest/env.sh
cd lobby-loadtest
```

Lobby load, e.g. 10k players, 1000 lobby changes/s and 2000 count requests/s
for 60s, plus 65s idle to measure refresh on its own:

```bash
node lt.mjs 10000 4 1000 2000 60 65 10k > out.log; python fmt.py out.log
# args: <clients> <client processes> <changes/s> <counts/s> <steady s> <idle s> <label>
```

Concurrency tests (each waits a full 65s refresh cycle where it matters):

```bash
node race.mjs handoff close churn counts replace simultaneous flush
node rs-race.mjs ordering dupcreate dualcreate reconnect leak load
```

`race.mjs stale` reproduces the cross-worker stale write fixed by
`fix(back): Close a user's older WS connections on every worker`; with the fix
in, `replace` is the test to run instead.

Replay upload races need the e2e harness (`RunTester`). Stop the backend first,
since the e2e setup wipes whatever is on these ports, then:

```bash
cp lobby-loadtest/http-upload-race.e2e-spec.ts apps/backend-e2e/src/
npx jest -c apps/backend-e2e/jest.config.ts http-upload-race --forceExit
rm apps/backend-e2e/src/http-upload-race.e2e-spec.ts
```

Afterwards:

```bash
taskkill //F //T //PID <backend primary pid>   # Windows: stopping the script leaves node running
lobby-loadtest/stack.sh down
```

## Caveats

- Backend CPU sampling uses PowerShell, so it's Windows-only (reads 0 elsewhere).
- The load generator ran on the same machine as the backend and Docker, so
  latencies include its own overhead and are on the pessimistic side.
- Valkey ran in Docker on WSL2, not the production setup.
