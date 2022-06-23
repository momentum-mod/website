import { Test, TestingModule } from '@nestjs/testing';
import { SentryPerformanceService } from './sentry-performance/sentry-performance.service';
import { SentryInterceptor } from './sentry.interceptor';

describe('SentryInterceptor', () => {
    let performanceService: SentryPerformanceService;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SentryPerformanceService]
        }).compile();

        performanceService = module.get<SentryPerformanceService>(SentryPerformanceService);
    });

    it('should be defined', () => {
        expect(new SentryInterceptor(performanceService)).toBeDefined();
    });
});
