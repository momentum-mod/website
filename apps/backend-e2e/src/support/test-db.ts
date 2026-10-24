import { startPrismaDevServer } from '@prisma/dev';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';

const MIGRATIONS_PATH = path.resolve(
  __dirname,
  '../../../../libs/db/src/migrations'
);

export interface TestDatabase {
  /** Create a Prisma driver adapter connected to this database. */
  createAdapter: () => PrismaPg;
  stop: () => Promise<void>;
}

/**
 * Start an in-memory Postgres (PGlite, via the local `prisma dev` server) with
 * all Prisma migrations applied.
 *
 * PGlite has a single session, so the server only lets one client connection
 * be active at a time and holds the rest pending until it disconnects. Pools
 * therefore must not sit on idle connections (see {@link createAdapter}), and a
 * query made outside an open transaction will wait for that transaction to
 * finish; backend code must use the `tx` it's given inside `$transaction`.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const server = await startPrismaDevServer({
    name: `e2e-${process.pid}`,
    persistenceMode: 'stateless',
    port: await getFreePort(),
    databasePort: await getFreePort(),
    shadowDatabasePort: await getFreePort()
  });

  const connectionString = server.database.connectionString;

  try {
    await applyMigrations(connectionString);
  } catch (error) {
    await server.close();
    throw error;
  }

  return {
    createAdapter: () =>
      new PrismaPg({
        connectionString,
        // Only one connection is served at a time, so give it up as soon as
        // it's idle for the next client (backend, test utils...) to take.
        max: 1,
        idleTimeoutMillis: 1
      }),
    stop: () => server.close()
  };
}

// Equivalent of `prisma migrate deploy`, minus the `_prisma_migrations`
// bookkeeping, which nothing here depends on (`nukeDb` skips it anyway).
async function applyMigrations(connectionString: string): Promise<void> {
  const migrations = (await readdir(MIGRATIONS_PATH, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const migration of migrations) {
      const sql = await readFile(
        path.join(MIGRATIONS_PATH, migration, 'migration.sql'),
        'utf8'
      );
      try {
        await client.query(sql);
      } catch (error) {
        throw new Error(`Failed to apply migration ${migration}`, {
          cause: error
        });
      }
    }
  } finally {
    await client.end();
  }
}

// Ask the OS for a free port, so concurrent runs don't collide.
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}
