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
        userID: 'c64397a6-20b6-4c3a-a02e-2a6fecad6b8e',
        user: {
          id: 'c64397a6-20b6-4c3a-a02e-2a6fecad6b8e',
          steamID: '828288828528',
          alias: 'Spooderman',
          aliasLocked: false,
          avatarURL: '',
          roles: 0,
          bans: 0,
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
      activityService.getUserActivity(1).subscribe(value =>
          expect(value).toEqual(expectedActivities, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#getRecentActivity() should return recent Activity', () => {
      httpClientSpy.get.and.returnValue(of(expectedActivities));
      activityService.getRecentActivity(0).subscribe(value =>
          expect(value).toEqual(expectedActivities, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
});
});
