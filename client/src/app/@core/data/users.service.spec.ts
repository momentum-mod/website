import {of} from 'rxjs';
import {User, UsersService} from './users.service';

let httpClientSpy: { get: jasmine.Spy };
let usersService: UsersService;
let expectedUsers: User[];

describe('UsersService', () => {
  beforeEach(() => {
    // TODO: spy on other methods too
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    usersService = new UsersService(<any> httpClientSpy);
    expectedUsers = [
      {
        id: '1',
        permissions: 0,
        profile: {
          id: '0',
          alias: 'test1',
          avatarURL: 'url',
        },
      },
      {
        id: '1',
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
  });
});
