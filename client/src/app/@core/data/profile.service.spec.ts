/*import {ProfileService, UserProfile} from './profile.service';
import {of} from 'rxjs';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy};
let profileService: ProfileService;

describe('MapsService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch']);
    profileService = new ProfileService(<any> httpClientSpy);
  });

  it('should return updated user profile info', () => {
    const expectedProfile: UserProfile = {
      id: '0',
      alias: 'test1',
      avatarURL: 'url',
    };
    it('#updateUserProfile() should return updated user profile', () => {
      httpClientSpy.patch.and.returnValue(of(expectedProfile));
      profileService.updateUserProfile('1', expectedProfile).subscribe(value =>
          expect(value).toEqual(expectedProfile, 'expected user'),
        fail,
      );
      expect(httpClientSpy.patch.calls.count()).toBe(1, 'one call');
    });
  });
});*/
