import { ReplayHeader } from './index';
import { RunSplits } from '@momentum/constants';

/**
 * Parse a MomentumTV replay (.mtv) header.
 * @throws {ReplayReadError}
 */
export function readHeader(buffer: Readonly<Buffer>): ReplayHeader {
  try {
    return {
      magic: buffer.readUInt32LE(0),
      formatVersion: buffer.readInt32LE(4),
      timestamp: Number(buffer.readBigInt64LE(8)),
      mapName: readNullTerminatedString(buffer, 16),
      mapHash: readNullTerminatedString(buffer, 80),
      gamemode: buffer.readUInt8(121),
      tickInterval: buffer.readFloatLE(122),
      playerSteamID: buffer.readBigUInt64LE(126),
      playerName: readNullTerminatedString(buffer, 134),
      trackType: buffer.readUInt8(166),
      trackNum: buffer.readUInt8(167),
      runTime: buffer.readDoubleLE(168)
    };
  } catch (error) {
    throw new ReplayReadError(error.code, error.message);
  }
}

/**
 * Parse the JSON RunSplits section of a MomentumTV replay (.mtv).
 * @throws {ReplayReadError}
 */
export function readRunSplits(buffer: Readonly<Buffer>): RunSplits.Splits {
  let length: number, splits: string, lastChar: number;
  try {
    length = buffer.readInt32LE(193) - 1;
    splits = buffer.toString('utf8', 197, 197 + length);
    lastChar = buffer.readUInt8(197 + length);
  } catch (error) {
    throw new ReplayReadError(error.code, error.message);
  }

  if (splits.length !== length || splits.at(-1) !== '}' || lastChar !== 0x00) {
    throw new ReplayReadError('Bad splits');
  }

  return JSON.parse(splits);
}

export class ReplayReadError extends Error {
  /** Node error code https://nodejs.org/api/errors.html#nodejs-error-codes */
  code: string;

  constructor(message: string, code?: string) {
    super();
    this.message = message;
    this.code = code;
    this.name = 'ReplayReadError';
  }
}

function readNullTerminatedString(
  buffer: Readonly<Buffer>,
  offset: number
): string {
  return buffer.toString('utf8', offset, buffer.indexOf(0x00, offset, 'utf8'));
}
