import { createHash } from 'node:crypto';

export function createSha1Hash(input: Buffer | string) {
  return createHash('sha1')
    .update(Buffer.isBuffer(input) ? input : Buffer.from(input))
    .digest('hex');
}
