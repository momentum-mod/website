import {MapsService} from './maps.service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';

let httpClientSpy: { get: jasmine.Spy, post: jasmine.Spy  };
let mapsService: MapsService;
let expectedMap: MomentumMap;
let expectedMaps: MomentumMap[];

describe('MapsService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    mapsService = new MapsService(<any> httpClientSpy);
    expectedMap = {
      id: 9,
      hash: null,
      name: 'testmap1',
      statusFlag: 0,
      createdAt: new Date(),
    };
    expectedMaps = [
      expectedMap,
      {
        id: 40000,
        hash: null,
        name: 'testmap2',
        statusFlag: 0,
        createdAt: new Date(),
      },
    ];
  });


  describe('Unit Tests', () => {


    it('#searchMaps should return expected maps', () => {
      httpClientSpy.get.and.returnValue(of(expectedMaps));
      mapsService.searchMaps('whatever').subscribe(
        value => expect(value).toEqual(expectedMaps, 'expected maps == 3'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });

    it('#getMap should return expected map ', () => {
      httpClientSpy.get.and.returnValue(of(expectedMap));
      mapsService.getMap(expectedMap.id).subscribe(
        value => expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });


    it('#createMap should return expected map ', () => {
      httpClientSpy.post.and.returnValue(of(expectedMap));
      mapsService.createMap(expectedMap).subscribe(
        value => expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.post.calls.count()).toBe(1, 'one call');
    });

    // STILL NEEDED

    // getMapFileUploadLocation
    // uploadMapFile
    // updateMapAvatar
    // createMapImage
    // updateMapImage
    // deleteMapImage
  });

});
