import { PrismaClient } from '@prisma/client';

export const nuke = async (prisma: PrismaClient) => {
  // Just to be extra safe...
  const env = process.env.NODE_ENV;
  if (!(env === 'dev' || env === 'test')) {
    console.error('seed.ts: This script should never be used in production!');
    process.abort();
  }

  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
};
