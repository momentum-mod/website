import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
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
    set: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([])
  };

  const valkeyMock = {
    mget: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    pipeline: jest.fn(() => pipelineMock)
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
    jest.clearAllMocks();
    pipelineMock.set.mockReturnThis();
    pipelineMock.exec.mockResolvedValue([]);
    GAMEMODE_FEATURED_TIER_OVERRIDES.clear();
    await module.close();
  });

  //#region onModuleInit

  describe('onModuleInit', () => {
    it('should populate the cache if any gamemode key is missing', async () => {
      // All null → triggers a full refresh
      valkeyMock.mget.mockResolvedValueOnce(ACTIVE_GAMEMODES.map(() => null));
      db.mMap.findMany.mockResolvedValue([]);

      await service.onModuleInit();

      // One pipeline.set call per active gamemode, then exec once
      expect(pipelineMock.set).toHaveBeenCalledTimes(ACTIVE_GAMEMODES.length);
      expect(pipelineMock.exec).toHaveBeenCalledTimes(1);
    });

    it('should not refresh if all gamemode keys are already cached', async () => {
      valkeyMock.mget.mockResolvedValueOnce(
        ACTIVE_GAMEMODES.map(() => JSON.stringify([1, 2, 3]))
      );

      await service.onModuleInit();

      expect(pipelineMock.exec).not.toHaveBeenCalled();
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
      valkeyMock.mget.mockResolvedValueOnce(cached);

      const result = await service.getFeaturedMaps();

      // Gamemodes with empty arrays should be filtered out
      expect(result).toHaveLength(2);

      const surf = result.find((r) => r.gamemode === Gamemode.SURF);
      expect(surf?.mapIDs).toEqual(surfIds);

      const bhop = result.find((r) => r.gamemode === Gamemode.BHOP);
      expect(bhop?.mapIDs).toEqual(bhopIds);
    });

    it('should return an empty array when no maps exist for any gamemode', async () => {
      valkeyMock.mget.mockResolvedValueOnce(
        ACTIVE_GAMEMODES.map(() => JSON.stringify([]))
      );

      const result = await service.getFeaturedMaps();

      expect(result).toEqual([]);
    });
  });

  //#endregion

  //#region refreshForGamemode (via public hook)

  describe('refreshForGamemode', () => {
    const mapA = { id: 1 };
    const mapB = { id: 2 };
    const mapC = { id: 3 };

    it('should store one map ID per tier slot', async () => {
      db.mMap.findMany
        .mockResolvedValueOnce([mapA] as any) // slot 1
        .mockResolvedValueOnce([mapB] as any) // slot 2
        .mockResolvedValueOnce([mapC] as any); // slot 3

      const [key, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );

      expect(key).toBe(valkeyKey(Gamemode.SURF));
      expect(JSON.parse(value)).toEqual([mapA.id, mapB.id, mapC.id]);
    });

    it('should skip a slot when no candidates are available', async () => {
      db.mMap.findMany
        .mockResolvedValueOnce([mapA] as any) // slot 1
        .mockResolvedValueOnce([]) // slot 2 – no maps
        .mockResolvedValueOnce([mapC] as any); // slot 3

      const [key, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );

      expect(key).toBe(valkeyKey(Gamemode.SURF));
      expect(JSON.parse(value)).toEqual([mapA.id, mapC.id]);
    });

    it('should not pick the same map twice across slots', async () => {
      // Both slot 1 and slot 2 only have mapA available
      db.mMap.findMany
        .mockResolvedValueOnce([mapA] as any) // slot 1 picks mapA
        .mockResolvedValueOnce([mapA] as any) // slot 2 – mapA already used, skipped
        .mockResolvedValueOnce([mapB] as any); // slot 3

      const [, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );
      const stored: number[] = JSON.parse(value);

      expect(new Set(stored).size).toBe(stored.length); // no duplicates
      expect(stored).toContain(mapA.id);
      expect(stored).toContain(mapB.id);
    });

    it('should store an empty array when no maps exist for the gamemode', async () => {
      db.mMap.findMany.mockResolvedValue([]);

      const [key, value] = await (service as any).refreshForGamemode(
        Gamemode.SURF
      );

      expect(key).toBe(valkeyKey(Gamemode.SURF));
      expect(JSON.parse(value)).toEqual([]);
    });

    it('should query using the correct leaderboard filters', async () => {
      db.mMap.findMany.mockResolvedValue([]);

      await (service as any).refreshForGamemode(Gamemode.BHOP);

      const [firstCall] = db.mMap.findMany.mock.calls;
      const where = firstCall[0].where;

      expect(where.status).toBe(MapStatus.APPROVED);
      expect(where.leaderboards.some.gamemode).toBe(Gamemode.BHOP);
      expect(where.leaderboards.some.trackType).toBe(TrackType.MAIN);
      expect(where.leaderboards.some.type).toBe(LeaderboardType.RANKED);
    });

    it('should apply the correct tier range for each slot', async () => {
      db.mMap.findMany.mockResolvedValue([]);

      await (service as any).refreshForGamemode(Gamemode.SURF);

      const tiers = db.mMap.findMany.mock.calls.map(
        ([args]) => args.where.leaderboards.some.tier
      );

      const [[min1, max1], [min2, max2], [min3, max3]] = DEFAULT_FEATURED_TIERS;
      expect(tiers[0]).toEqual({ gte: min1, lte: max1 });
      expect(tiers[1]).toEqual({ gte: min2, lte: max2 });
      expect(tiers[2]).toEqual({ gte: min3, lte: max3 });
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
      db.mMap.findMany.mockResolvedValue([]);

      await (service as any).refreshForGamemode(Gamemode.SURF);

      const tiers = db.mMap.findMany.mock.calls.map(
        ([args]) => args.where.leaderboards.some.tier
      );

      expect(tiers[0]).toEqual({ gte: 1, lte: 3 });
      expect(tiers[1]).toEqual({ gte: 4, lte: 5 });
      expect(tiers[2]).toEqual({ gte: 6, lte: 8 });
    });
  });

  //#endregion
});
