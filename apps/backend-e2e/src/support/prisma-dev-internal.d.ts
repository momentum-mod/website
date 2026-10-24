// TypeScript's `node` module resolution ignores package.json `exports`, so it
// can't find @prisma/dev's `internal/*` entry points; point them at the
// declarations they map to.
declare module '@prisma/dev/internal/db' {
  export * from '@prisma/dev/dist/db';
}

declare module '@prisma/dev/internal/state' {
  export * from '@prisma/dev/dist/state';
}
