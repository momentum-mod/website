import { Test, TestingModule } from '@nestjs/testing';
import { SentryPerformanceService } from './sentry-performance.service';

describe('SentryService', () => {
    let service: SentryPerformanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SentryPerformanceService]
        }).compile();

        service = module.get<SentryPerformanceService>(SentryPerformanceService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
