import { Test, TestingModule } from '@nestjs/testing';
import { SentryExceptionService } from './sentry-exception.service';

describe('SentryExceptionService', () => {
  let service: SentryExceptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SentryExceptionService],
    }).compile();

    service = module.get<SentryExceptionService>(SentryExceptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
