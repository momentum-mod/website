#!/bin/bash -i

# Generates a migration with the given name. Nx executors still fail to run
# in interactive mode, despite Nx claiming it's supported.
# (https://github.com/nrwl/nx/issues/8269)

export "$(grep -v '^#' .env | xargs)"
npx prisma migrate dev --name "$1" --skip-seed --schema ./libs/db/src/schema.prisma
