import { Test, TestingModule } from '@nestjs/testing';
import { MapsService } from './maps.service';
import { mockDeep } from 'jest-mock-extended';

describe('MapsService', () => {
  let service: MapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapsService]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapsService>(MapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
