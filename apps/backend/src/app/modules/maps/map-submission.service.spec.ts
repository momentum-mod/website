import { Test, TestingModule } from '@nestjs/testing';
import { MapSubmissionService } from './map-submission.service';
import { mockDeep } from 'jest-mock-extended';
import { PRISMA_MOCK_PROVIDER } from '../../../../test/prisma-mock.const';

describe('MapSubmissionService', () => {
  let service: MapSubmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapSubmissionService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapSubmissionService>(MapSubmissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
