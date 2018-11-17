import {MapsService} from './maps.service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy  };
let mapsService: MapsService;
let expectedMaps: MomentumMap[];

describe('MapsService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch']);
    mapsService = new MapsService(<any> httpClientSpy);
    expectedMaps = [
      {
        id: '9',
        name: 'testmap1',
        submitterID: '1337',
        statusFlag: 0,
        createdAt: new Date(),
      },
      {
        id: '40000',
        name: 'testmap2',
        submitterID: '1337',
        statusFlag: 0,
        createdAt: new Date(),
      },
    ];
  });


  describe('Unit Tests', () => {


    it('should return expected maps', () => {
      httpClientSpy.get.and.returnValue(of(expectedMaps));
      mapsService.searchMaps('whatever').subscribe(value =>
          expect(value).toEqual(expectedMaps, 'expected maps == 3'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });

    it('#getMap() should return expected map ID', () => {
      httpClientSpy.get.and.returnValue(of(expectedMaps));
      mapsService.getMap('mapID').subscribe(value =>
          expect(value).toEqual(expectedMaps, 'expected map'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
// TODO: Test methods for downloading maps
  });

});
