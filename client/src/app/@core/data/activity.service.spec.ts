import {of} from 'rxjs';
import {ActivityService} from './activity.service';
import {Activities} from '../models/activities.model';
import {Activity_Type} from '../models/activity-type.model';

let httpClientSpy: { get: jasmine.Spy };
let activityService: ActivityService;
let expectedActivities: Activities;

describe('ActivityService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    activityService = new ActivityService(<any> httpClientSpy);
    expectedActivities = {
      activities: [{
        id: 1,
        type: Activity_Type.MAP_UPLOADED,
        userID: '828288828528',
        user: {
          id: '828288828528',
          alias: 'Spooderman',
          avatarURL: '',
          permissions: 0,
          country: 'US',
        },
        data: '1',
      }],
    };
  });

  describe('Unit Tests', () => {
  it('#getFollowedActivity() should return followed Activity', () => {
    httpClientSpy.get.and.returnValue(of(expectedActivities));
    activityService.getFollowedActivity().subscribe(value =>
        expect(value).toEqual(expectedActivities, 'expected activity'),
      fail,
    );
    expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
  });
    it('#getUserActivity() should return user Activity', () => {
      httpClientSpy.get.and.returnValue(of(expectedActivities));
      activityService.getUserActivity('userID').subscribe(value =>
          expect(value).toEqual(expectedActivities, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getRecentActivity() should return recent Activity', () => {
      httpClientSpy.get.and.returnValue(of(expectedActivities));
      activityService.getRecentActivity().subscribe(value =>
          expect(value).toEqual(expectedActivities, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
});
});
