import { createHash, randomBytes } from 'node:crypto';

export function randomString(): string {
    return Math.random().toString(36).slice(2);
}

export function randomNumberString(bytes: number): string {
    return BigInt('0x' + randomBytes(bytes).toString('hex')).toString(10);
}

export function randomSteamID(): string {
    return randomNumberString(8);
}

export function randomYoutubeID(): string {
    return randomString().slice(0, 10);
}

export function randomHash(): string {
    return createHash('sha1').update(randomString()).digest('hex');
}
