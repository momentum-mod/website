import { faker } from '@faker-js/faker';
import { createHash } from 'node:crypto';

export function randomString(length = 12): string {
  return faker.string.alphanumeric(length);
}

export function randomSteamID(): bigint {
  return BigInt(faker.string.numeric(18));
}

export function randomYoutubeID(): string {
  return randomString(10);
}

export function randomHash(): string {
  return createHash('sha1').update(randomString()).digest('hex');
}
