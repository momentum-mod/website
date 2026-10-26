import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
process.env['NODE_ENV'] = 'test';
faker.seed(1);

// Valkey and S3 are shared with whatever else is using the same servers (dev,
// other E2E workers), so each E2E worker gets its own partition of both. This
// is a preload as the backend reads its config when it's imported.
//
// Valkey database 0 and the dev bucket are never used (and `nukeValkey` and
// `nukeS3` refuse to wipe them): they're what `.env` points the dev backend at.
const worker = Number.parseInt(process.env['MOMENTUM_E2E_WORKER'] ?? '0', 10);
const bucket = `${process.env['STORAGE_BUCKET_NAME'] || 'momtest'}-e2e-w${worker}`;
const cdn = process.env['CDN_URL'] || 'http://localhost:9000/momtest';

process.env['MOMENTUM_E2E_WORKER'] = String(worker);
process.env['VALKEY_DB'] = String(worker + 1);
process.env['STORAGE_BUCKET_NAME'] = bucket;
// CDN_URL includes the bucket as its last path segment.
process.env['CDN_URL'] = cdn.replace(/\/[^/]*$/, `/${bucket}`);
