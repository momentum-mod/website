import { PrismaClient } from '@momentum/db';
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client
} from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'node:path';
import Valkey from 'iovalkey';
import { TestDatabase, startTestDatabase } from './test-db';

let testDb: TestDatabase | undefined;

export default async function globalSetup() {
  const envPath = path.resolve(__dirname, '../../../../.env');
  dotenv.config({ path: envPath });

  // Postgres runs in-memory (PGlite), freshly migrated, so there's nothing to
  // nuke. DATABASE_URL from .env (for dev) is unused.
  testDb = await startTestDatabase();

  // Parallel workers each get their own bucket, which doesn't exist yet.
  if (process.env['MOMENTUM_E2E_WORKER'] !== undefined) await ensureBucket();

  // Clear out the S3 bucket
  await nukeS3();

  // Clear Valkey storage
  await nukeValkey();

  // Explicitly set test environment. When running this Nx it seems to be 'dev',
  // probably because it's loading .env later. So it probably doesn't matter in
  // CI, just in local dev.
  process.env['NODE_ENV'] = 'test';
}

/** A driver adapter for the in-memory test database. */
export function createDbAdapter() {
  if (!testDb) throw new Error('Test database has not been started');
  return testDb.createAdapter();
}

export async function stopDb(): Promise<void> {
  const db = testDb;
  testDb = undefined;
  await db?.stop();
}

export async function nukeDb(prisma: PrismaClient) {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename::text FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
}

function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.STORAGE_REGION,
    endpoint: process.env.STORAGE_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
    },
    forcePathStyle: true
  });
}

/**
 * Create this worker's bucket if needed, readable by anyone: downloads in the
 * tests go over plain HTTP via CDN_URL, as with the shared bucket that
 * docker-compose creates (`createbuckets`).
 */
async function ensureBucket(): Promise<void> {
  const Bucket = process.env.STORAGE_BUCKET_NAME;
  const s3 = createS3Client();
  try {
    try {
      await s3.send(new CreateBucketCommand({ Bucket }));
    } catch (error) {
      if (!(error instanceof BucketAlreadyOwnedByYou)) throw error;
    }
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${Bucket}/*`]
            }
          ]
        })
      })
    );
  } finally {
    s3.destroy();
  }
}

export async function nukeS3(): Promise<void> {
  const s3 = createS3Client();

  try {
    let continuationToken: string | undefined;
    do {
      const objects = await s3.send(
        new ListObjectsV2Command({
          Bucket: process.env.STORAGE_BUCKET_NAME,
          ContinuationToken: continuationToken
        })
      );
      const keys = objects.Contents?.flatMap(({ Key }) =>
        Key ? [{ Key }] : []
      );
      if (keys?.length) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: process.env.STORAGE_BUCKET_NAME,
            Delete: { Objects: keys }
          })
        );
      }
      continuationToken = objects.IsTruncated
        ? objects.NextContinuationToken
        : undefined;
    } while (continuationToken);
  } finally {
    s3.destroy();
  }
}

export async function nukeValkey() {
  const valkey = new Valkey({
    port: +process.env.VALKEY_PORT,
    host: process.env.VALKEY_HOST || 'localhost',
    db: +(process.env.VALKEY_DB || 0)
  });
  try {
    // Only this worker's logical database, other workers may be mid-test.
    await valkey.flushdb();
  } finally {
    await valkey.quit();
  }
}
