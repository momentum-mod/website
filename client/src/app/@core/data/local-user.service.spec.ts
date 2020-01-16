import {async, TestBed} from '@angular/core/testing';

import {LocalUserService} from './local-user.service';
import {AuthService} from './auth.service';
import {CookieService} from 'ngx-cookie-service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';
import {User} from '../models/user.model';

import {UserFollowObject} from '../models/follow.model';
import {FollowStatus} from '../models/follow-status.model';
import {MapNotify} from '../models/map-notify.model';
import {Router, RouterModule} from '@angular/router';
import {ThemeModule} from '../../@theme/theme.module';
import {MomentumMapType} from '../models/map-type.model';
import {MapLibrary} from '../models/map-library.model';
import {MomentumMaps} from '../models/momentum-maps.model';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy, post: jasmine.Spy, put: jasmine.Spy, delete: jasmine.Spy  };
let expectedUser: User;
let expectedMaps: MomentumMaps;
let expectedMap: MomentumMap;
let expectedMapLibrary: MapLibrary;
let expectedFollow: UserFollowObject;
let expectedFollow2: UserFollowObject;
let expectedFollowStatus: FollowStatus;
let expectedMapNotify: MapNotify;
let localUserService: LocalUserService;


describe('LocalUserService', () => {

  let cookieServiceStub: Partial<CookieService>;

  beforeEach(async(() => {
    expectedUser = {
      id: 1,
      steamID: '76561198131664084',
      avatarURL: '',
      alias: 'cjshiner',
      aliasLocked: false,
      country: 'US',
      roles: 0,
      bans: 0,
      profile: {
        id: '1',
        bio: 'test',
      },
    };

    expectedMap = {
      id: 9,
      hash: null,
      name: 'testmap1',
      type: MomentumMapType.UNKNOWN,
      statusFlag: 0,
      createdAt: new Date().toString(),
    };
    expectedMaps = {
      count: 1,
      maps: [expectedMap],
    };
    expectedMapLibrary = {
      count: 2,
      entries: [{
        id: 1,
        userID: 1,
        mapID: 9,
        map: expectedMap,
      }],
    };
    expectedFollow = {
      followeeID: '9',
      followedID: '40000',
      notifyOn: 2,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
    };

    expectedFollow2 = {
      followeeID: '40000',
      followedID: '9',
      notifyOn: 2,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
    };
    expectedFollowStatus = {
      local: expectedFollow,
      target: expectedFollow2,
    };
    expectedMapNotify = {
      id: 1,
      followeeID: 1,
      mapID: 9,
      notifyOn: 2,
    };

    cookieServiceStub = {
      check: (name: 'user') => true,
      get: (name: 'user') => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      delete: (name: 'user') =>  null,
    };
    const routerStub = {
      navigate(commands: any): void {},
    };

    TestBed.configureTestingModule({
      imports: [ThemeModule, RouterModule.forRoot([])],
      providers: [
        LocalUserService,
        { provide: CookieService, useValue: cookieServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    });
    const spy =
      jasmine.createSpyObj('CookieService', ['check', 'get', 'delete']);

    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch', 'post', 'put', 'delete']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    localUserService = new LocalUserService(new AuthService(spy, <any> httpClientSpy, <any> routerSpy),
      spy, <any> httpClientSpy);
  }));


  describe('Unit Tests', () => {


    it('#getLocalUser() should return specific users profile', () => {
      httpClientSpy.get.and.returnValue(of(expectedUser));
      localUserService.getLocalUser().subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });

    it('#updateUser() should update the users profile and return the updated version', () => {
      httpClientSpy.patch.and.returnValue(of(expectedUser));
      localUserService.updateUser(<any>{id: '1', profile: { id: '1', bio: 'testNewBio'}}).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.patch.calls.count()).toBe(1, 'one call');
    });
    it('#getMapLibrary() should return the maps in the specified users library', () => {
      httpClientSpy.get.and.returnValue(of(expectedMapLibrary));
      localUserService.getMapLibrary().subscribe(value =>
          expect(value).toEqual(expectedMapLibrary, 'expected maps'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });




    it('#addMapToLibrary() adds map to the local users library', () => {
      httpClientSpy.put.and.returnValue(of(expectedMap));
      localUserService.addMapToLibrary(expectedMap.id).subscribe(value =>
          expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.put.calls.count()).toBe(1, 'one call');
    });
    it('#removeMapFromLibrary() should remove the specified map from the users library', () => {
      httpClientSpy.delete.and.returnValue(of(expectedMap));
      localUserService.removeMapFromLibrary(expectedMap.id).subscribe(value =>
          expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.delete.calls.count()).toBe(1, 'one call');
    });
    it('#isMapInLibrary() should return specified map in the users library', () => {
      httpClientSpy.get.and.returnValue(of(expectedMap));
      localUserService.isMapInLibrary(12345).subscribe(value =>
          expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getSubmittedMaps() returns all maps submitted by the user', () => {
      httpClientSpy.get.and.returnValue(of(expectedMaps));
      localUserService.getSubmittedMaps().subscribe(value =>
          expect(value).toEqual(expectedMaps, 'expected maps'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });

    it('#checkFollowStatus() should return a json obj with two booleans to represent follow status ', () => {
      httpClientSpy.get.and.returnValue(of(expectedFollowStatus));
      localUserService.checkFollowStatus(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedFollowStatus, 'expected follow status'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#followUser() should update the user following', () => {
      httpClientSpy.post.and.returnValue(of(expectedFollow));
      localUserService.followUser(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedFollow, 'expected follow obj'),
        fail,
      );
      expect(httpClientSpy.post.calls.count()).toBe(1, 'one call');
    });

    it('#updateFollowStatus() should update the following status on the users profile ', () => {
       httpClientSpy.patch.and.returnValue(of(expectedUser));
      localUserService.updateFollowStatus(expectedUser, 1).subscribe(value =>
          expect(value).toEqual(expectedUser,  'expected user'),
        fail,
      );
      expect(httpClientSpy.patch.calls.count()).toBe(1, 'one call');
    });
    it('#unfollowUser() should remove the following status from the users profile', () => {
      httpClientSpy.delete.and.returnValue(of(expectedUser));
      localUserService.unfollowUser(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.delete.calls.count()).toBe(1, 'one call');
    });

    it('#checkMapNotify() should check the map notifcation status for a given user', () => {
      httpClientSpy.get.and.returnValue(of(expectedMapNotify));
      localUserService.checkMapNotify(expectedMap.id).subscribe(value =>
        expect(value).toEqual(expectedMapNotify, 'expected map notify'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#updateMapNotify() should update map notification status or create new if no existing notifcations', () => {
      httpClientSpy.put.and.returnValue(of(expectedMapNotify));
      localUserService.updateMapNotify(expectedMap.id, 1).subscribe(value =>
        expect(value).toEqual(expectedMapNotify, 'expected map notify'),
        fail,
        );
        expect(httpClientSpy.put.calls.count()).toBe(1, 'one call');
    });
    it('#disableMapNotify() should remove the user from map notifcations list', () => {
      httpClientSpy.delete.and.returnValue(of(expectedMapNotify));
      localUserService.disableMapNotify(expectedMap.id).subscribe(value =>
        expect(value).toEqual(expectedMapNotify, 'expected map notify'),
        fail,
        );
        expect(httpClientSpy.delete.calls.count()).toBe(1, 'one call');
    });
  });
});
