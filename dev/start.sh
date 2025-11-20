#!/bin/sh
set -e

echo "Running database migrations..."
npx nx run db:push

echo "Starting services..."
# We use npx concurrently to run both services. 
# Adjust the commands if your nx targets are different (e.g., serve:backend vs serve backend)
npx concurrently "npx nx serve backend" "npx nx serve frontend"
