# Environment for the isolated load-test stack. Source it: `. lobby-loadtest/env.sh`
#
# Everything points at throwaway containers on non-default ports (see stack.sh),
# never the dev database, Valkey or storage. Variables already set here win over
# the repo's .env, as dotenv and Nest's ConfigModule leave pre-set ones alone.

LOADTEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
# Node on Windows needs a Windows path for NODE_PATH
REPO_DIR="$(cd "$LOADTEST_DIR/.." && (pwd -W 2>/dev/null || pwd))"

export DATABASE_URL="postgresql://root:root@127.0.0.1:55432/momentum?schema=public"
export VALKEY_HOST=127.0.0.1 VALKEY_PORT=56379
export STORAGE_ENDPOINT_URL=http://127.0.0.1:59000 STORAGE_REGION=us-west-1 STORAGE_BUCKET_NAME=momtest
export STORAGE_ACCESS_KEY_ID=minio STORAGE_SECRET_ACCESS_KEY=minio123
export RUN_STORAGE_ENDPOINT_URL=http://127.0.0.1:59000 RUN_STORAGE_REGION=us-west-1 RUN_STORAGE_BUCKET_NAME=momtest
export RUN_STORAGE_ACCESS_KEY_ID=minio RUN_STORAGE_SECRET_ACCESS_KEY=minio123
export CDN_URL=http://127.0.0.1:59000/momtest RUN_CDN_URL=http://127.0.0.1:59000/momtest
# ConfigValidation: JWT_SECRET has a minimum length, SESSION_SECRET must be exactly 32 chars
export JWT_SECRET=loadtest-jwt-secret-0123456789abcdef0123456789abcdef
export SESSION_SECRET=0123456789abcdef0123456789abcdef
export STEAM_WEB_API_KEY=loadtest

# 'dev' rather than 'prod': prod binds 0.0.0.0, which triggers a firewall prompt on Windows
export NODE_ENV=dev NEST_PORT=3100 LOG_LEVEL=warn
# Spread connections evenly over cluster workers (Windows otherwise lets the OS pick)
export NODE_CLUSTER_SCHED_POLICY=rr
# Don't let the map list cron run during tests
export MAP_LIST_UPDATE_SCHEDULE="0 0 1 1 *"
export NODE_PATH="$REPO_DIR/node_modules"

loadtest_env_is_isolated() {
  case "$DATABASE_URL $VALKEY_PORT $STORAGE_ENDPOINT_URL $NEST_PORT" in
    *:55432/*" 56379 "*:59000*" 3100") return 0 ;;
    *) echo "REFUSING: load-test env is not pointed at the isolated stack" >&2; return 1 ;;
  esac
}
