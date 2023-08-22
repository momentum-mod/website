import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityCardComponent } from './activity-card.component';
import { ActivityService } from '@momentum/frontend/data';
import { ReplaySubject } from 'rxjs';
import { Activity, User } from '@momentum/constants';
import { ActivityType } from '@momentum/constants';
import { SharedModule } from '../../../shared.module';

describe('ActivityCardComponent', () => {
  let component: ActivityCardComponent;
  let fixture: ComponentFixture<ActivityCardComponent>;
  let activityService: ActivityService;

  let idCounter = 0;
  const newActivityData = (): Omit<Activity, 'type'> => ({
    data: idCounter++,
    id: idCounter,
    userID: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [ActivityCardComponent],
      providers: [
        {
          provide: ActivityService,
          useValue: {
            getFollowedActivity: jest.fn(),
            getUserActivity: jest.fn(),
            getRecentActivity: jest.fn()
          }
        }
      ]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityCardComponent);
    component = fixture.componentInstance;
    activityService = TestBed.inject(ActivityService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('init', () => {
    it('should call getFollowedActivity on init if follow is true', () => {
      component.follow = true;
      jest
        .spyOn(activityService, 'getFollowedActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.ngOnInit();
      expect(activityService.getFollowedActivity).toHaveBeenCalled();
    });

    it('should not call getFollowedActivity on init if follow is false', () => {
      component.follow = false;
      jest
        .spyOn(activityService, 'getFollowedActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.ngOnInit();
      expect(activityService.getFollowedActivity).not.toHaveBeenCalled();
    });

    it('should call getUserActivity on init if userSubject is defined', () => {
      component.userSubject = new ReplaySubject<User>();
      jest.spyOn(component.userSubject, 'subscribe');
      jest
        .spyOn(activityService, 'getUserActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.ngOnInit();
      expect(component.userSubject.subscribe).toHaveBeenCalled();
    });

    it('should call getRecentActivity on init if recent is true', () => {
      component.recent = true;
      jest
        .spyOn(activityService, 'getRecentActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.ngOnInit();
      expect(activityService.getRecentActivity).toHaveBeenCalled();
    });

    it('should not call getRecentActivity on init if recent is false', () => {
      component.recent = false;
      jest
        .spyOn(activityService, 'getRecentActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.ngOnInit();
      expect(activityService.getRecentActivity).not.toHaveBeenCalled();
    });
  });

  describe('filterActivites', () => {
    it('should filter activities by type', () => {
      component.activities = [
        { type: ActivityType.REVIEW_MADE, ...newActivityData() },
        { type: ActivityType.MAP_UPLOADED, ...newActivityData() },
        { type: ActivityType.MAP_APPROVED, ...newActivityData() }
      ];
      component.filterValue = ActivityType.MAP_UPLOADED;
      component.filterActivites(component.activities);
      expect(component.filteredActivities.length).toBe(1);
      expect(component.filteredActivities[0].type).toBe(
        ActivityType.MAP_UPLOADED
      );
    });

    it('should not filter activities if filterValue is ALL', () => {
      component.activities = [
        { type: ActivityType.REVIEW_MADE, ...newActivityData() },
        { type: ActivityType.MAP_UPLOADED, ...newActivityData() },
        { type: ActivityType.MAP_APPROVED, ...newActivityData() }
      ];
      component.filterValue = ActivityType.ALL;
      component.filterActivites(component.activities);
      expect(component.filteredActivities.length).toBe(3);
    });
  });

  describe('getActivities', () => {
    it('should call getFollowedActivity if follow is true', () => {
      component.follow = true;
      jest
        .spyOn(activityService, 'getFollowedActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.getActivities();
      expect(activityService.getFollowedActivity).toHaveBeenCalled();
    });

    it('should call getUserActivity if userSubject is defined', () => {
      component.userSubject = new ReplaySubject<User>();
      jest.spyOn(component.userSubject, 'subscribe');
      jest
        .spyOn(activityService, 'getUserActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.getActivities();
      expect(component.userSubject.subscribe).toHaveBeenCalled();
    });

    it('should call getRecentActivity if recent is true', () => {
      component.recent = true;
      jest
        .spyOn(activityService, 'getRecentActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.getActivities();
      expect(activityService.getRecentActivity).toHaveBeenCalled();
    });
  });

  describe('getMoreActivities', () => {
    it('should get more activities if canLoadMore is true and recent is true', () => {
      component.recent = true;
      component.canLoadMore = true;
      jest
        .spyOn(activityService, 'getRecentActivity')
        .mockReturnValueOnce(new ReplaySubject());
      component.getMoreActivities();
      expect(activityService.getRecentActivity).toHaveBeenCalled();
    });

    it('should not get more activities if canLoadMore is false', () => {
      component.recent = true;
      component.canLoadMore = false;
      jest.spyOn(activityService, 'getRecentActivity');
      component.getMoreActivities();
      expect(activityService.getRecentActivity).not.toHaveBeenCalled();
    });

    it('should not get more activities if recent is false', () => {
      component.recent = false;
      component.canLoadMore = true;
      jest.spyOn(activityService, 'getRecentActivity');
      component.getMoreActivities();
      expect(activityService.getRecentActivity).not.toHaveBeenCalled();
    });
  });

  describe('onGetActivities', () => {
    it('should set initialActivity to true and update activities and filteredActivities on onGetActivities', () => {
      const response = {
        returnCount: 3,
        totalCount: 3,
        data: [
          { type: ActivityType.REVIEW_MADE, ...newActivityData() },
          { type: ActivityType.MAP_UPLOADED, ...newActivityData() },
          { type: ActivityType.MAP_APPROVED, ...newActivityData() }
        ]
      };
      component.filterValue = ActivityType.REVIEW_MADE;
      component.onGetActivities(response);
      expect(component.initialActivity).toBe(true);
      expect(component.activities).toEqual(response.data);
      expect(component.filteredActivities.length).toBe(1);
      expect(component.filteredActivities[0].type).toBe(
        ActivityType.REVIEW_MADE
      );
    });
  });
});
