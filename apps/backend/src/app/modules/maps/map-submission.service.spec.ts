import { Test, TestingModule } from '@nestjs/testing';
import { MapSubmissionService } from './map-submission.service';
import { mockDeep } from 'jest-mock-extended';

describe('MapSubmissionService', () => {
  let service: MapSubmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapSubmissionService]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<MapSubmissionService>(MapSubmissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
