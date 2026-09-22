import { Test, TestingModule } from '@nestjs/testing';
import { PastRunsService } from './past-runs.service';
import { mockDeep } from 'jest-mock-extended';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { Gamemode, MapStatus, Style, TrackType } from '@momentum/constants';

describe('PastRunsService', () => {
  let service: PastRunsService;
  let db: PrismaMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PastRunsService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get(PastRunsService);
    db = module.get(EXTENDED_PRISMA_SERVICE);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should include gamemode, trackType, trackNum, and style in where clause when provided', async () => {
      db.pastRun.findManyAndCount.mockResolvedValueOnce([[], 0]);

      await service.getAll({
        skip: 0,
        take: 10,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 1,
        style: Style.NORMAL
      });

      expect(db.pastRun.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            mmap: { status: MapStatus.APPROVED }
          })
        })
      );
    });

    it('should not include gamemode, trackType, trackNum, or style in where clause when omitted', async () => {
      db.pastRun.findManyAndCount.mockResolvedValueOnce([[], 0]);

      await service.getAll({ skip: 0, take: 10 });

      const callArg = db.pastRun.findManyAndCount.mock.calls[0][0] as any;
      expect(callArg.where.gamemode).toBeUndefined();
      expect(callArg.where.trackType).toBeUndefined();
      expect(callArg.where.trackNum).toBeUndefined();
      expect(callArg.where.style).toBeUndefined();
    });

    it('should filter by specific gamemode and trackType only if others are omitted', async () => {
      db.pastRun.findManyAndCount.mockResolvedValueOnce([[], 0]);

      await service.getAll({
        skip: 0,
        take: 10,
        gamemode: Gamemode.BHOP,
        trackType: TrackType.BONUS
      });

      const callArg = db.pastRun.findManyAndCount.mock.calls[0][0] as any;
      expect(callArg.where.gamemode).toBe(Gamemode.BHOP);
      expect(callArg.where.trackType).toBe(TrackType.BONUS);
      expect(callArg.where.trackNum).toBeUndefined();
      expect(callArg.where.style).toBeUndefined();
    });
  });
});
