#!/usr/bin/env bash
# Run a built backend bundle against the isolated stack on :3100.
#   lobby-loadtest/start-backend.sh <workers>    (1 = single-process mode)
#
# Uses lobby-loadtest/backend/main.js, a copy of dist/apps/backend/main.js, so a
# running `nx serve` rebuilding dist mid-test can't swap the code out. Output
# goes to lobby-loadtest/backend.log, which lt.mjs reads the worker PIDs from.
#
# On Windows, stopping this script leaves node running: kill the process tree
# (`taskkill //F //T //PID <primary pid>`) instead.
set -euo pipefail
. "$(dirname "$0")/env.sh"
loadtest_env_is_isolated

BUNDLE="$LOADTEST_DIR/backend/main.js"
if [ ! -f "$BUNDLE" ]; then
  echo "No bundle at $BUNDLE: build the backend and copy dist/apps/backend/main.js* there" >&2
  exit 1
fi

export NEST_CLUSTER_NUM_PROCESSES="${1:-4}"
cd "$LOADTEST_DIR/.."
exec node "$BUNDLE" > "$LOADTEST_DIR/backend.log" 2>&1
