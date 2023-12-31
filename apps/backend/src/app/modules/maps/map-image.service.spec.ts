import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import { PRISMA_MOCK_PROVIDER } from '../../../../test/prisma-mock.const';
import { MapImageService } from './map-image.service';

describe('MapImageService', () => {
  let service: MapImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapImageService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapImageService>(MapImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
