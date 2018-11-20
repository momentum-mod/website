/*
 import {HttpClient} from '@angular/common/http';
import {UserProfile} from '../models/profile.model';
import {User} from '../models/user.model';
import {Permission} from '../models/permissions.model';
import {UserFollowObject} from '../models/follow.model';
import {FollowStatus} from '../models/follow-status.model';

import { CookieService } from 'ngx-cookie-service';
import {LocalUserService} from './local-user.service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';
import {AuthService} from './auth.service';
import {TestBed} from '@angular/core/testing';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy, post: jasmine.Spy, delete: jasmine.Spy  };
let localUserService: LocalUserService;
let authService: AuthService;
// let cookieService: CookieService;
let expectedUser: User;
let expectedMaps: MomentumMap[];
let expectedMap: MomentumMap;
let authServiceSpy: jasmine.SpyObj<AuthService>;

describe('LocalUserService', () => {
  beforeEach(() => {

    // const authServiceSpy = jasmine.createSpyObj('AuthService', [])
    TestBed.configureTestingModule({
       // providers: LocalUserService, {provide: AuthService, useValue: authServiceSpy},
    });

    // TestBed.configureTestingModule({providers: [CookieService]});
    // const authServiceSpy = jasmine.createSpyObj('')
    // authService = new AuthService(<any> CookieService, <any> httpClientSpy);

    // cookieService = TestBed.get(CookieService);
    // authService = TestBed.get(AuthService);
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch', 'post', 'delete']);
    localUserService = new LocalUserService( authService,  <any> httpClientSpy);
    expectedUser = {
      id: '76561198131664084',
      permissions: 0,
      profile: {
        id: '1',
        avatarURL: '',
        alias: 'cjshiner',
        bio: 'test',
      },
    };
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


    it('#getLocalUser() should return specific users profile', () => {
      httpClientSpy.get.and.returnValue(of(expectedUser));
      localUserService.getLocalUser().subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
/*
    it('#updateProfile() should update the users profile and return the updated version', () => {
      httpClientSpy.patch.and.returnValue(of(expectedUser));
      localUserService.updateProfile({id: '1', alias: 'cjs', avatarURL: '', bio: 'testNewBio'}).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getMapLibrary() should return the maps in the specified users library', () => {
      httpClientSpy.get.and.returnValue(of(expectedMaps));
      localUserService.getMapLibrary().subscribe(value =>
          expect(value).toEqual(expectedMaps, 'expected maps'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });




    it('#addMapToLibrary() adds map to the local users library', () => {
      httpClientSpy.post.and.returnValue(of(expectedUser));
      localUserService.addMapToLibrary(expectedMap.id).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#removeMapFromLibrary() should remove the specified map from the users library', () => {
      httpClientSpy.delete.and.returnValue(of(expectedMap));
      localUserService.removeMapFromLibrary(expectedMap.id).subscribe(value =>
          expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#isMapInLibrary() should return specified map in the users library', () => {
      httpClientSpy.get.and.returnValue(of(expectedMaps));
      localUserService.isMapInLibrary(12345).subscribe(value =>
          expect(value).toEqual(expectedMaps, 'expected maps'),
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


/*
    it('#checkFollowStatus() should return a json obj with two booleans to represent follow status ', () => {
      httpClientSpy.get.and.returnValue(of(<FollowStatus>));
      localUserService.checkFollowStatus(expectedUser).subscribe(value =>
          expect(value).toEqual(, 'expected true'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#followUser() should update the user following', () => {
      httpClientSpy.post.and.returnValue(of(expectedUser));
      localUserService.followUser(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected maps'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });*/
/*
    it('#updateFollowStatus() should update the following status on the users profile ', () => {
      httpClientSpy.patch.and.returnValue(of(expectedMap, 1));
      localUserService.updateFollowStatus(expectedUser, 1).subscribe(value =>
          expect(value).toEqual(expectedMap, 'expected map'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#unfollowUser() should remove the s', () => {
      httpClientSpy.delete.and.returnValue(of(expectedUser));
      localUserService.unfollowUser(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected maps'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
*/

