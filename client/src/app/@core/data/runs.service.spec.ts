import {of} from 'rxjs';
import {RunsService} from './runs.service';

let httpClientSpy: { get: jasmine.Spy };
let runsServiceMock: RunsService;

describe('RunsService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    runsServiceMock = new RunsService(<any>httpClientSpy);
  });

  describe('Unit Tests', () => {
    it('#getMapRuns() should return map runs', () => {
      httpClientSpy.get.and.returnValue(of(runsServiceMock));
      runsServiceMock.getMapRuns(12).subscribe(value =>
          expect(value).toEqual(runsServiceMock, 'expected runs'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getRun should return run info', () => {
      httpClientSpy.get.and.returnValue(of(runsServiceMock));
      runsServiceMock.getRun('125').subscribe(value =>
        expect(value).toEqual(runsServiceMock, 'expected run'), fail);
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getRuns should return run info', () => {
      httpClientSpy.get.and.returnValue(of(runsServiceMock));
      runsServiceMock.getRuns().subscribe(value =>
        expect(value).toEqual(runsServiceMock, 'expected runs'), fail);
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
