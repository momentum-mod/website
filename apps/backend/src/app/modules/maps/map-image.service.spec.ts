import { Test, TestingModule } from '@nestjs/testing';
import { MapImageService } from './map-image.service';
import { mockDeep } from 'jest-mock-extended';

describe('MapImageService', () => {
  let service: MapImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapImageService]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapImageService>(MapImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
