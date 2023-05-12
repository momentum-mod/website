import { TestBed } from '@angular/core/testing';
import { StatsService } from './stats.service';
import { GlobalBaseStats } from '../models/global-base-stats.model';
import { GlobalMapStats } from '../models/global-map-stats.model';
import { of } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { MomentumMapType } from '../models/map-type.model';

let httpClientSpy: { get: jasmine.Spy };
let statsService: StatsService;
let expectedGlobalBaseStats: GlobalBaseStats;
let expectedGlobalMapStats: GlobalMapStats;

describe('StatsService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    statsService = new StatsService(<any>httpClientSpy);
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [StatsService]
    });
    expectedGlobalBaseStats = {
      totalJumps: '15',
      totalStrafes: '6',
      runsSubmitted: '3'
    };
    expectedGlobalMapStats = {
      totalCompletedMaps: 1,
      totalMaps: 2,
      topSubscribedMap: {
        id: 123,
        name: 'triggertests',
        type: MomentumMapType.UNKNOWN,
        hash: 'hashlol',
        statusFlag: 0
      },
      topPlayedMap: {
        id: 123,
        name: 'triggertests',
        type: MomentumMapType.UNKNOWN,
        hash: 'hashlol',
        statusFlag: 0
      },
      topDownloadedMap: {
        id: 123,
        name: 'triggertests',
        type: MomentumMapType.UNKNOWN,
        hash: 'hashlol',
        statusFlag: 0
      },
      topUniquelyCompletedMap: {
        id: 123,
        name: 'triggertests',
        type: MomentumMapType.UNKNOWN,
        hash: 'hashlol',
        statusFlag: 0
      }
    };
  });

  describe('Unit Tests', () => {
    it('should be created', () => {
      const service: StatsService = TestBed.get(StatsService);
      expect(service).toBeTruthy();
    });

    it('#getGlobalBaseStats should return expected base stats ', () => {
      httpClientSpy.get.and.returnValue(of(expectedGlobalBaseStats));
      statsService
        .getGlobalBaseStats()
        .subscribe(
          (value) =>
            expect(value).toEqual(
              expectedGlobalBaseStats,
              'expected base stats'
            ),
          fail
        );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });

    it('#getGlobalMapStats should return expected map stats ', () => {
      httpClientSpy.get.and.returnValue(of(expectedGlobalMapStats));
      statsService
        .getGlobalMapStats()
        .subscribe(
          (value) =>
            expect(value).toEqual(expectedGlobalMapStats, 'expected map stats'),
          fail
        );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
