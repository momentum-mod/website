import {AdminService} from './admin.service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';
import {User} from '../models/user.model';
import {MomentumMapType} from '../models/map-type.model';
import {MomentumMaps} from '../models/momentum-maps.model';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy  };
let adminService: AdminService;
let expectedMaps: MomentumMaps;
let expectedMap: MomentumMap;
let expectedUser: User;

describe('AdminService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch']);
    adminService = new AdminService(<any> httpClientSpy);
    expectedUser = {
      id: '1',
      country: 'US',
      permissions: 0,
      profile: {
        id: '0',
        alias: 'test1',
        avatarURL: 'url',
      },
    };
    expectedMap = {
      id: 9,
      name: 'testmap1',
      type: MomentumMapType.UNKNOWN,
      hash: '',
      statusFlag: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      submitterID: '12345',
    };
    expectedMaps = {
      count: 2,
      maps: [
        expectedMap,
        {
          id: 40000,
          name: 'testmap2',
          type: MomentumMapType.UNKNOWN,
          hash: '',
          statusFlag: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          submitterID: '123456',
        },
      ],
    };
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
    it('#updateUser() should return updated user account', () => {
      httpClientSpy.patch.and.returnValue(of(expectedUser));
      adminService.updateUser(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.patch.calls.count()).toBe(1, 'one call');
    });
  });
});


