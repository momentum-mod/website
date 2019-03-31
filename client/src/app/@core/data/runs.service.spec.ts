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
      tickRate: 60,
      createdAt: new Date(),
      time: 53,
      flags: 0,
      file: '',
      mapID: 1,
      playerID: '825825825828',
      isPersonalBest: true,
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
