
import {AdminService} from './admin.service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy  };
let adminService: AdminService;
let expectedMaps: MomentumMap[];
let expectedMap: MomentumMap;

describe('AdminService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch']);
    adminService = new AdminService(<any> httpClientSpy);
    expectedMap = {
      id: '9',
      name: 'testmap1',
      statusFlag: 0,
      createdAt: new Date(),
    };
    expectedMaps = [
      expectedMap,
      {
        id: '40000',
        name: 'testmap2',
        statusFlag: 0,
        createdAt: new Date(),
      },
    ];
  });

  describe('Unit Tests', () => {
    // TODO: change parameter to context(?)
    it('#getMaps() should return expected maps', () => {
      httpClientSpy.get.and.returnValue(of(expectedMaps));
      adminService.getMaps(expectedMap).subscribe(value =>
          expect(value).toEqual(expectedMaps, 'expected maps'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#updateMaps() should return updated maps', () => {
      httpClientSpy.patch.and.returnValue(of(expectedMaps));
      adminService.updateMap(expectedMap.id, expectedMap).subscribe(value =>
          expect(value).toEqual(expectedMaps, 'expected maps'),
        fail,
      );
      expect(httpClientSpy.patch.calls.count()).toBe(1, 'one call');
    });
  });
});


