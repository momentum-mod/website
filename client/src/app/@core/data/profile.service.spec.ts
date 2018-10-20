import {ProfileService, UserProfile} from './profile.service';
import {of} from 'rxjs';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy};
let ProfileServices: ProfileService;

describe('MapsService', () => {
  beforeEach(() => {
    // TODO: spy on other methods too
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch']);
    ProfileServices = new ProfileService(<any> httpClientSpy);
  });

  it('should return updated user profile info', () => {
    const expectedProfile: UserProfile[] = [
      {
          id: '0',
          alias: 'test1',
          avatarURL: 'url',
      },
      {
          id: '1',
          alias: 'test2',
          avatarURL: 'url',
      },
    ];
    it('#updateUserProfile() should return updated user profile', () => {
      httpClientSpy.patch.and.returnValue(of(expectedProfile[0] ));
      ProfileServices.updateUserProfile('1', expectedProfile[0]).subscribe(value =>
          expect(value).toEqual(expectedProfile[0], 'expected user'),
        fail,
      );
      expect(httpClientSpy.patch.calls.count()).toBe(1, 'one call');
    });
  });
});
