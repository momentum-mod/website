import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import { PRISMA_MOCK_PROVIDER } from '../../../../test/prisma-mock.const';
import { MapCreditsService } from './map-credits.service';

describe('MapCreditsService', () => {
  let service: MapCreditsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapCreditsService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapCreditsService>(MapCreditsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
