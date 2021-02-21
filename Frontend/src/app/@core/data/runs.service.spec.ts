import {of} from 'rxjs';
import {RunsService} from './runs.service';
import {Runs} from '../models/runs.model';
import {Run} from '../models/run.model';

let httpClientSpy: { get: jasmine.Spy };
let runsServiceMock: RunsService;
let expectedRun: Run;
let expectedRuns: Runs;

describe('RunsService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    runsServiceMock = new RunsService(<any>httpClientSpy);
    expectedRun = {
      id: 1,
      tickRate: 0.015,
      createdAt: new Date().toString(),
      ticks: 53,
      time: 0.795,
      flags: 0,
      zoneNum: 0,
      trackNum: 0,
      file: '',
      mapID: 1,
      playerID: '76b877dc-b345-4c41-9259-9c8a3c921e63',
      rank: {
        id: 1,
        mapID: 0,
        userID: '76b877dc-b345-4c41-9259-9c8a3c921e63',
        runID: '1',
        rank: 0,
        rankXP: 0,
        gameType: 0,
        trackNum: 0,
        zoneNum: 0,
        flags: 0,
      },
    };
    expectedRuns = {
      count: 1,
      runs: [expectedRun],
    };
  });

  describe('Unit Tests', () => {
    it('#getMapRuns() should return map runs', () => {
      httpClientSpy.get.and.returnValue(of(expectedRuns));
      runsServiceMock.getMapRuns(12).subscribe(value =>
          expect(value).toEqual(expectedRuns, 'expected runs'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getRun should return run info', () => {
      httpClientSpy.get.and.returnValue(of(expectedRun));
      runsServiceMock.getRun('125').subscribe(value =>
        expect(value).toEqual(expectedRun, 'expected run'), fail);
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getRuns should return run info', () => {
      httpClientSpy.get.and.returnValue(of(expectedRuns));
      runsServiceMock.getRuns().subscribe(value =>
        expect(value).toEqual(expectedRuns, 'expected runs'), fail);
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
