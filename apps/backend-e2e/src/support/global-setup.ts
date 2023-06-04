import { PrismaClient } from '@prisma/client';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client
} from '@aws-sdk/client-s3';
import { faker } from '@faker-js/faker';

module.exports = async function () {
  // Seed faker for consistent random number generation
  faker.seed(1);

  // Nuke the current DB (Bye)
  await nukeDB();

  // Clear out the S3 bucket
  await nukeS3();

  // Explicitly set test environment. When running this Nx it seems to be 'dev',
  // probably because it's loading .env later. So it probably doesn't matter in
  // CI, just in local dev.
  (process.env as any).NODE_ENV = 'test';
};

// Nx is having an issue resolving paths from this file, after trying to solve
// for hours I'm just stuffing @momentum/db's nuke() in here. Sorry!
async function nukeDB() {
  const prisma = new PrismaClient();

  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);

  await prisma.$disconnect();
}

async function nukeS3() {
  const s3 = new S3Client({
    region: process.env.STORAGE_REGION,
    endpoint:
      process.env.IS_DOCKERIZED_API === 'true'
        ? process.env.STORAGE_ENDPOINT_URL_DOCKERIZED
        : process.env.STORAGE_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
    },
    forcePathStyle: true
  });

  const objects = await s3.send(
    new ListObjectsV2Command({ Bucket: process.env.STORAGE_BUCKET_NAME })
  );
  if (objects?.Contents?.length > 0)
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: process.env.STORAGE_BUCKET_NAME,
        Delete: {
          Objects: objects.Contents.map((object) => ({ Key: object.Key }))
        }
      })
    );
}
