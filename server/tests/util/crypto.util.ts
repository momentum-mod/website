import { createHash } from 'node:crypto';

export function createSha1Hash(buffer: Buffer) {
    return createHash('sha1').update(buffer).digest('hex');
}
