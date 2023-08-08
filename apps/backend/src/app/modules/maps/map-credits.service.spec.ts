import { Test, TestingModule } from '@nestjs/testing';
import { MapCreditsService } from './map-credits.service';
import { mockDeep } from 'jest-mock-extended';

describe('MapCreditsService', () => {
  let service: MapCreditsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapCreditsService]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapCreditsService>(MapCreditsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
