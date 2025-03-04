import { ReplayHeader } from './index';
import { RunSplits } from '@momentum/constants';

/**
 * Write a MomentumTV replay (.mtv) header.
 * @throws {ReplayReadError}
 */
export function writeHeader(header: ReplayHeader, buffer: Buffer): void {
  try {
    buffer.writeUInt32LE(header.magic, 0);
    buffer.writeInt32LE(header.formatVersion, 4);
    buffer.writeBigInt64LE(BigInt(Math.floor(header.timestamp)), 8);
    buffer.write(header.mapName, 16, 80, 'utf8');
    buffer.write(header.mapHash, 80, 121, 'utf8');
    buffer.writeUInt8(header.gamemode, 121);
    buffer.writeFloatLE(header.tickInterval, 122);
    buffer.writeBigUInt64LE(header.playerSteamID, 126);
    buffer.write(header.playerName, 134, 166, 'utf8');
    buffer.writeUInt8(header.trackType, 166);
    buffer.writeUInt8(header.trackNum, 167);
    buffer.writeDoubleLE(header.runTime, 168);
  } catch (error) {
    throw new ReplayWriteError(error.code, error.message);
  }
}

/**
 * Write the JSON RunSplits section of a MomentumTV replay (.mtv).
 * @throws {ReplayWriteError}
 */
export function writeRunSplits(splits: RunSplits.Splits, buffer: Buffer): void {
  try {
    const splitsStr = JSON.stringify(splits);
    buffer.writeInt32LE(splitsStr.length + 1, 193);
    buffer.write(splitsStr, 197, splitsStr.length, 'utf8');
    buffer.writeUInt8(0x00, 197 + splitsStr.length);
  } catch (error) {
    throw new ReplayWriteError(error.code, error.message);
  }
}

export class ReplayWriteError extends Error {
  /** Node error code https://nodejs.org/api/errors.html#nodejs-error-codes */
  code: string;

  constructor(message: string, code?: string) {
    super();
    this.message = message;
    this.code = code;
    this.name = 'ReplayWriteError';
  }
}
