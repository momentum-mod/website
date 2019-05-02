import {MapsService} from './maps.service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';
import {MomentumMapType} from '../models/map-type.model';
import {MomentumMaps} from '../models/momentum-maps.model';
import {HttpResponse} from '@angular/common/http';

let httpClientSpy: { get: jasmine.Spy, post: jasmine.Spy  };
let mapsService: MapsService;
let expectedMap: MomentumMap;
let expectedMaps: MomentumMaps;
let expectedCreatedMap: HttpResponse<MomentumMap>;

describe('MapsService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    mapsService = new MapsService(<any> httpClientSpy);
    expectedMap = {
      id: 9,
      hash: null,
      name: 'testmap1',
      type: MomentumMapType.UNKNOWN,
      statusFlag: 0,
      createdAt: new Date().toString(),
    };
    expectedMaps = {
      count: 2,
      maps: [
        expectedMap,
        {
          id: 40000,
          hash: null,
          name: 'testmap2',
          type: MomentumMapType.UNKNOWN,
          statusFlag: 0,
          createdAt: new Date().toString(),
        },
      ],
    };
    expectedCreatedMap = new HttpResponse({
      body: expectedMap,
    });
  });


  describe('Unit Tests', () => {

    it('#getMap should return expected map ', () => {
      httpClientSpy.get.and.returnValue(of(expectedMap));
      mapsService.getMap(expectedMap.id).subscribe(
        value => expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });


    it('#createMap should return expected map ', () => {
      httpClientSpy.post.and.returnValue(of(expectedCreatedMap));
      mapsService.createMap(expectedMap).subscribe(
        value => expect(value).toEqual(expectedCreatedMap, 'expected map'),
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
