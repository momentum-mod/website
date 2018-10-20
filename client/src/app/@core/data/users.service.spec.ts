import {of} from 'rxjs';
import {User, UsersService} from './users.service';

let httpClientSpy: { get: jasmine.Spy, put: jasmine.Spy };
let usersService: UsersService;
let expectedUsers: User[];
let expectedUser: User;

describe('UsersService', () => {
  beforeEach(() => {
    // TODO: spy on other methods too
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'put']);
    usersService = new UsersService(<any> httpClientSpy);
    expectedUser = {
        id: '1',
        permissions: 0,
        profile: {
          id: '0',
          alias: 'test1',
          avatarURL: 'url',
        },
      };
    expectedUsers = [
      expectedUser,
      {
        id: '2',
        permissions: 1,
        profile: {
          id: '1',
          alias: 'test2',
          avatarURL: 'url1',
        },
      },
    ];
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
    it('#searchUsers() should return expected users', () => {
      httpClientSpy.get.and.returnValue(of(expectedUsers));
      usersService.searchUsers('users').subscribe(value =>
          expect(value).toEqual(expectedUsers, 'expected users'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getUser() should return expected user ID', () => {
      httpClientSpy.get.and.returnValue(of(expectedUsers));
      usersService.getUser('userID').subscribe(value =>
          expect(value).toEqual(expectedUsers, 'expected user'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#updateUser() should return updated user account', () => {
      httpClientSpy.put.and.returnValue(of(expectedUser));
      usersService.updateUser(expectedUser).subscribe(value =>
          expect(value).toEqual(expectedUser, 'expected user'),
        fail,
      );
      expect(httpClientSpy.put.calls.count()).toBe(1, 'one call');
    });
  });
});
