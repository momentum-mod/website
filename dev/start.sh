#!/bin/sh
set -e

echo "Running database migrations..."
npx nx run db:push

echo "Running database generation..."
npx nx run db:generate --args="--sql --no-hints"

echo "Starting services..."
# We use npx concurrently to run both services. 
# Adjust the commands if your nx targets are different (e.g., serve:backend vs serve backend)
npx nx run-many -t serve -p backend frontend -- --host=0.0.0.0
