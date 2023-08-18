import { Test, TestingModule } from '@nestjs/testing';
import { MapsService } from './maps.service';
import { mockDeep } from 'jest-mock-extended';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';

describe('MapsService', () => {
  let service: MapsService, db: PrismaMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapsService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get(MapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
