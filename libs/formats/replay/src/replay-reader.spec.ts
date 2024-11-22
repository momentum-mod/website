import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readHeader, readRunSplits, ReplayReadError } from './replay-reader';
import { REPLAY_MAGIC, ReplayHeader } from './index';
import { Gamemode, TrackType } from '@momentum/constants';

describe('Replay Reader', () => {
  let buffer: Buffer;

  beforeAll(() => {
    // replay.mtv is a I did on bhop_eazy on a build from red feat/mom-0.10
    // on 22/11/2024
    const filePath = join(__dirname, '../test/replay.mtv');
    buffer = readFileSync(filePath);
  });

  describe('readHeader', () => {
    it('should correctly parse the replay header', () => {
      const expectedHeader: Partial<ReplayHeader> = {
        magic: REPLAY_MAGIC,
        formatVersion: -1,
        timestamp: 1732201279n,
        mapName: 'bhop_eazy',
        mapHash: '07320480E9245C2363D806BC4D1661F8034709B5',
        gamemode: Gamemode.BHOP,
        playerSteamID: 76561198039308694n,
        playerName: 'fingerprince',
        tickInterval: expect.any(Number),
        trackType: TrackType.MAIN,
        trackNum: 1,
        runTime: 30.584999316371977
      };

      const header = readHeader(buffer);
      expect(header).toEqual(expectedHeader);
      expect(header.tickInterval).toBeCloseTo(0.01, 5);
    });

    it('should throw ReplayReadError on invalid buffer', () => {
      const invalidBuffer = Buffer.alloc(10);
      expect(() => readHeader(invalidBuffer)).toThrow(ReplayReadError);
    });
  });

  it("shouldn't throw when parsing run splits", () => {
    const splits = readRunSplits(buffer);
    expect(
      splits.segments.every(({ subsegments }) =>
        subsegments.every(({ minorNum }) => minorNum === 1)
      )
    ).toBe(true);
  });
});
