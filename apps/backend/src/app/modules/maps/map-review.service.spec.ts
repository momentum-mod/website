import { Test, TestingModule } from '@nestjs/testing';
import { MapReviewService } from './map-review.service';
import { mockDeep } from 'jest-mock-extended';
import { PRISMA_MOCK_PROVIDER } from '../../../../test/prisma-mock.const';

describe('MapReviewService', () => {
  let service: MapReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapReviewService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapReviewService>(MapReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
