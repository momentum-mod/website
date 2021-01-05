import {of} from 'rxjs';
import {UsersService} from './users.service';
import {User} from '../models/user.model';
import {Users} from '../models/users.model';
import {Followed} from '../models/followed.model';
import {Followers} from '../models/followers.model';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy };
let usersService: UsersService;
let expectedUsers: Users;
let expectedUser: User;
let expectedFollowed: Followed;
let expectedFollowers: Followers;

describe('UsersService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch']);
    usersService = new UsersService(<any> httpClientSpy);
    expectedUser = {
      id: 1,
      steamID: '1',
      alias: 'test1',
      aliasLocked: false,
      avatarURL: 'url',
      country: 'US',
      roles: 0,
      bans: 0,
      profile: {
        id: '0',
        bio: 'i am a banana!',
      },
    };
    expectedUsers = {
      count: 2,
      users: [
        expectedUser,
        {
          id: 2,
          steamID: '2',
          alias: 'test2',
          aliasLocked: false,
          avatarURL: 'url1',
          country: 'US',
          roles: 0,
          bans: 0,
          profile: {
            id: '1',
            bio: '',
          },
        },
      ],
    };
    expectedFollowed = {
      count: 1,
      followed: [{
        followeeID: '82582825252',
        followedID: '82582852353',
        notifyOn: 1,
      }],
    };
    expectedFollowers = {
      count: 1,
      followers: [{
        followeeID: '82582825252',
        followedID: '82582852353',
        notifyOn: 1,
      }],
    };
  });

  describe('Unit Tests', () => {
    it('#getUsers() should return expected users', () => {
      httpClientSpy.get.and.returnValue(of(expectedUsers));
      usersService.getUsers().subscribe(value =>
          expect(value).toEqual(expectedUsers, 'expected users'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getUser() should return expected user ID', () => {
      httpClientSpy.get.and.returnValue(of(expectedUser));
      usersService.getUser(1).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    //
    // getFollowersOfUser
    it('#getFollowersOfUser() should return followers of the user', () => {
      httpClientSpy.get.and.returnValue(of(expectedFollowers));
      usersService.getFollowersOfUser(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedFollowers, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    // getUserFollows
    it('#getUserFollows() should return the users the local user is following', () => {
      httpClientSpy.get.and.returnValue(of(expectedFollowed));
      usersService.getUserFollows(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedFollowed, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
