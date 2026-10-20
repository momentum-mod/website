import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockDeep,
  mockImplementationOnce,
  resetDeepMockCalls,
  resetMockCalls
} from '@momentum/test-utils';
import { ScheduleModule } from '@nestjs/schedule';
import {
  Gamemode,
  LeaderboardType,
  MapStatus,
  TrackType,
  DisabledGamemodes
} from '@momentum/constants';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ValkeyService } from '../valkey/valkey.service';
import {
  DEFAULT_FEATURED_TIERS,
  GAMEMODE_FEATURED_TIER_OVERRIDES,
  MapFeaturedService
} from './map-featured.service';
import * as Enum from '@momentum/enum';

const ACTIVE_GAMEMODES = Enum.values(Gamemode).filter(
  (gm) => !DisabledGamemodes.has(gm)
);

const valkeyKey = (gm: Gamemode) => `featured:maps:${gm}`;

describe('MapFeaturedService', () => {
  let service: MapFeaturedService;
  let db: PrismaMock;
  let module: TestingModule;

  const pipelineMock = {
    set: mock.fn(function (this: any) {
      return this;
    }),
    exec: mock.fn<() => Promise<any[]>>(async () => [])
  };

  const valkeyMock = {
    mget: mock.fn<(...args: any[]) => any>(),
    get: mock.fn<(...args: any[]) => any>(),
    set: mock.fn<(...args: any[]) => any>(),
    pipeline: mock.fn(() => pipelineMock)
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        MapFeaturedService,
        PRISMA_MOCK_PROVIDER,
        { provide: ValkeyService, useValue: valkeyMock }
      ]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get(MapFeaturedService);
    db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  afterEach(async () => {
    mock.restoreAll();
    resetDeepMockCalls();
    resetMockCalls(
      pipelineMock.set,
      pipelineMock.exec,
      valkeyMock.mget,
      valkeyMock.get,
      valkeyMock.set,
      valkeyMock.pipeline
    );
    GAMEMODE_FEATURED_TIER_OVERRIDES.clear();
    await module.close();
  });

  //#region onModuleInit

  describe('onModuleInit', () => {
    it('should populate the cache if any gamemode key is missing', async () => {
      // All null → triggers a full refresh
      valkeyMock.mget.mock.mockImplementationOnce(() =>
        Promise.resolve(ACTIVE_GAMEMODES.map(() => null))
      );
      db.mMap.findMany.mock.mockImplementation(() => Promise.resolve([]));

      await service.onModuleInit();

      // One pipeline.set call per active gamemode, then exec once
      assert.strictEqual(
        pipelineMock.set.mock.calls.length,
        ACTIVE_GAMEMODES.length
      );
      assert.strictEqual(pipelineMock.exec.mock.calls.length, 1);
    });

    it('should not refresh if all gamemode keys are already cached', async () => {
      valkeyMock.mget.mock.mockImplementationOnce(() =>
        Promise.resolve(ACTIVE_GAMEMODES.map(() => JSON.stringify([1, 2, 3])))
      );

      await service.onModuleInit();

      assert.strictEqual(pipelineMock.exec.mock.calls.length, 0);
    });
  });

  //#endregion

  //#region getFeaturedMaps

  describe('getFeaturedMaps', () => {
    it('should return cached IDs for all gamemodes', async () => {
      const surfIds = [10, 20, 30];
      const bhopIds = [40, 50];

      // Build a cache hit for every gamemode, using surfIds for SURF,
      // bhopIds for BHOP, and an empty array for the rest.
      const cached = ACTIVE_GAMEMODES.map((gm) => {
        if (gm === Gamemode.SURF) return JSON.stringify(surfIds);
        if (gm === Gamemode.BHOP) return JSON.stringify(bhopIds);
        return JSON.stringify([]);
      });
      valkeyMock.mget.mock.mockImplementationOnce(() =>
        Promise.resolve(cached)
      );

      const result = await service.getFeaturedMaps();

      // Gamemodes with empty arrays should be filtered out
      assert.strictEqual(result.length, 2);

      const surf = result.find((r) => r.gamemode === Gamemode.SURF);
      assert.deepStrictEqual(surf?.mapIDs, surfIds);

      const bhop = result.find((r) => r.gamemode === Gamemode.BHOP);
      assert.deepStrictEqual(bhop?.mapIDs, bhopIds);
    });

    it('should return an empty array when no maps exist for any gamemode', async () => {
      valkeyMock.mget.mock.mockImplementationOnce(() =>
        Promise.resolve(ACTIVE_GAMEMODES.map(() => JSON.stringify([])))
      );

      const result = await service.getFeaturedMaps();

      assert.deepStrictEqual(result, []);
    });
  });

  //#endregion

  //#region refreshForGamemode (via public hook)

  describe('refreshForGamemode', () => {
    const mapA = { id: 1 };
    const mapB = { id: 2 };
    const mapC = { id: 3 };

    it('should store one map ID per tier slot', async () => {
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapA] as any)
      );
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapB] as any)
      );
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapC] as any)
      ); // slot 3

      const [key, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );

      assert.strictEqual(key, valkeyKey(Gamemode.SURF));
      assert.deepStrictEqual(JSON.parse(value), [mapA.id, mapB.id, mapC.id]);
    });

    it('should skip a slot when no candidates are available', async () => {
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapA] as any)
      );
      mockImplementationOnce(db.mMap.findMany, () => Promise.resolve([]));
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapC] as any)
      ); // slot 3

      const [key, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );

      assert.strictEqual(key, valkeyKey(Gamemode.SURF));
      assert.deepStrictEqual(JSON.parse(value), [mapA.id, mapC.id]);
    });

    it('should not pick the same map twice across slots', async () => {
      // Both slot 1 and slot 2 only have mapA available
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapA] as any)
      );
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapA] as any)
      );
      mockImplementationOnce(db.mMap.findMany, () =>
        Promise.resolve([mapB] as any)
      ); // slot 3

      const [, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );
      const stored: number[] = JSON.parse(value);

      assert.strictEqual(new Set(stored).size, stored.length); // no duplicates
      assert.ok(stored.includes(mapA.id));
      assert.ok(stored.includes(mapB.id));
    });

    it('should store an empty array when no maps exist for the gamemode', async () => {
      db.mMap.findMany.mock.mockImplementation(() => Promise.resolve([]));

      const [key, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );

      assert.strictEqual(key, valkeyKey(Gamemode.SURF));
      assert.deepStrictEqual(JSON.parse(value), []);
    });

    it('should query using the correct leaderboard filters', async () => {
      db.mMap.findMany.mock.mockImplementation(() => Promise.resolve([]));

      await (service as any).refreshForGamemode(Gamemode.BHOP);

      const [firstCall] = db.mMap.findMany.mock.calls;
      const where = firstCall.arguments[0].where;

      assert.strictEqual(where.status, MapStatus.APPROVED);
      assert.strictEqual(where.leaderboards.some.gamemode, Gamemode.BHOP);
      assert.strictEqual(where.leaderboards.some.trackType, TrackType.MAIN);
      assert.strictEqual(where.leaderboards.some.type, LeaderboardType.RANKED);
    });

    it('should apply the correct tier range for each slot', async () => {
      db.mMap.findMany.mock.mockImplementation(() => Promise.resolve([]));

      await (service as any).refreshForGamemode(Gamemode.SURF);

      const tiers = db.mMap.findMany.mock.calls.map(
        ({ arguments: [args] }) => args.where.leaderboards.some.tier
      );

      const [[min1, max1], [min2, max2], [min3, max3]] = DEFAULT_FEATURED_TIERS;
      assert.deepStrictEqual(tiers[0], { gte: min1, lte: max1 });
      assert.deepStrictEqual(tiers[1], { gte: min2, lte: max2 });
      assert.deepStrictEqual(tiers[2], { gte: min3, lte: max3 });
    });

    it('should use per-gamemode tier overrides when configured', async () => {
      const overrideTiers: [
        readonly [number, number],
        readonly [number, number],
        readonly [number, number]
      ] = [
        [1, 3],
        [4, 5],
        [6, 8]
      ];
      GAMEMODE_FEATURED_TIER_OVERRIDES.set(Gamemode.SURF, overrideTiers);
      db.mMap.findMany.mock.mockImplementation(() => Promise.resolve([]));

      await (service as any).refreshForGamemode(Gamemode.SURF);

      const tiers = db.mMap.findMany.mock.calls.map(
        ({ arguments: [args] }) => args.where.leaderboards.some.tier
      );

      assert.deepStrictEqual(tiers[0], { gte: 1, lte: 3 });
      assert.deepStrictEqual(tiers[1], { gte: 4, lte: 5 });
      assert.deepStrictEqual(tiers[2], { gte: 6, lte: 8 });
    });
  });

  //#endregion
});
