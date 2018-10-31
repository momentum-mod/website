import {of} from 'rxjs';
import {ActivityService} from './activity.service';

let httpClientSpy: { get: jasmine.Spy };
let activityService: ActivityService;

describe('ActivityService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    activityService = new ActivityService(<any> httpClientSpy);
  });

  describe('Unit Tests', () => {
  it('#getFollowedActivity() should return followed Activity', () => {
    httpClientSpy.get.and.returnValue(of(activityService));
    activityService.getFollowedActivity().subscribe(value =>
        expect(value).toEqual(activityService, 'expected activity'),
      fail,
    );
    expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
  });
    it('#getUserActivity() should return user Activity', () => {
      httpClientSpy.get.and.returnValue(of(activityService));
      activityService.getUserActivity('userID').subscribe(value =>
          expect(value).toEqual(activityService, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getRecentActivity() should return recent Activity', () => {
      httpClientSpy.get.and.returnValue(of(activityService));
      activityService.getRecentActivity().subscribe(value =>
          expect(value).toEqual(activityService, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
});
});
