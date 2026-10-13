#!/usr/bin/env bash
# Start or stop the throwaway Postgres/Valkey/MinIO containers for load testing.
#   lobby-loadtest/stack.sh up      start, migrate and seed
#   lobby-loadtest/stack.sh down    stop (containers are --rm, so all data goes)
#
# Ports are deliberately not the dev defaults (55432/56379/59000), so nothing
# here can touch the dev database, Valkey or storage.
set -euo pipefail
. "$(dirname "$0")/env.sh"
loadtest_env_is_isolated

NAMES="lobbylt-postgres lobbylt-valkey lobbylt-minio"

case "${1:-}" in
  up)
    docker run -d --rm --name lobbylt-postgres -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root \
      -e POSTGRES_DB=momentum -p 127.0.0.1:55432:5432 postgres:18 >/dev/null
    docker run -d --rm --name lobbylt-valkey -p 127.0.0.1:56379:6379 valkey/valkey:8.1.3 >/dev/null
    docker run -d --rm --name lobbylt-minio -e MINIO_ROOT_USER=minio -e MINIO_ROOT_PASSWORD=minio123 \
      -p 127.0.0.1:59000:9000 minio/minio:RELEASE.2025-03-12T18-04-18Z server /data >/dev/null
    sleep 6
    docker run --rm --network container:lobbylt-minio --entrypoint sh minio/mc:RELEASE.2025-03-12T17-29-24Z \
      -c "mc alias set t http://127.0.0.1:9000 minio minio123 >/dev/null && mc mb t/momtest" >/dev/null
    (cd "$LOADTEST_DIR/.." && npx prisma migrate deploy --config libs/db/src/prisma.config.ts)
    docker exec -i lobbylt-postgres psql -q -U root -d momentum < "$LOADTEST_DIR/seed.sql"
    echo "Isolated stack up"
    ;;
  down)
    docker stop $NAMES >/dev/null || true
    echo "Isolated stack down"
    ;;
  *)
    echo "usage: $0 up|down" >&2
    exit 1
    ;;
esac
