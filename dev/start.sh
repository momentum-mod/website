#!/bin/sh
set -e

echo "Running database migrations..."
npx nx run db:push

echo "Running database generation..."
npx nx run db:generate --args="--sql --no-hints"

echo "Starting services in MODE: ${MODE:-full}..."

if [ "$MODE" = "backend" ]; then
    exec npx nx serve backend --host ${HOST:-0.0.0.0}
elif [ "$MODE" = "frontend" ]; then
    exec npx nx serve frontend --host ${HOST:-0.0.0.0}
else # Default: Start Both (Full)
    exec npx nx run-many -t serve -p backend frontend -- --host ${HOST:-0.0.0.0}
fi