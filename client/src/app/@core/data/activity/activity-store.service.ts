import { Injectable } from '@angular/core';
import { ActivityService } from './activity.service';
import { Activities } from '../../models/activities.model';
import { Activity } from '../../models/activity.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { Activity_Type } from '../../models/activity-type.model';

@Injectable()
export class ActivityStoreService {

  public canLoadMore = true;
  public filterValue = Activity_Type.ALL;

  constructor(
    private activityService: ActivityService,
  ) { }

  // Service Observables

  // Activities
  private _activities: BehaviorSubject<Activity[]> = new BehaviorSubject([]);
  public readonly activities$: Observable<Activity[]> = this._activities.asObservable();

  set activities(n: Activity[]) {
    this._activities.next(n);
  }

  get activities() {
    return this._activities.value;
  }


  /**
   * @return activities of users you follow
   */
  getFollowedActivity(): void {
    this.activityService.getFollowedActivity().pipe(
      take(1),
      map((c: Activities) => {
        this.activities = c.activities;
      }),
    );
  }

  /**
   * @param userID ID of user we are retieving
   * @return a list of specific users's activity
   */
  getUserActivity(userID: number): void {
    this.activityService.getUserActivity(userID).pipe(
      take(1),
      map((c: Activities) => {
        this.activities = c.activities;
      }),
    );
  }

  /**
   * @param offset number of activities offset from most recent activity
   * @return stores a fresh list of the most recent activities
   */
  getRecentActivity(offset: number): void {
    this.activityService.getRecentActivity(offset).pipe(
      take(1),
      map((c: Activities) => {
        if(c)
        this.activities = c.activities;
      }),
    );
  }
 /**
   * @param offset number of activities offset from most recent activity
   * @return stores more items onto the list of activities
   */
  loadMoreRecentActivities(offset: number): void {
    this.activityService.getRecentActivity(offset).pipe(
      take(1),
      map((c: Activities) => {
        if (c.activities.length !== 0) {
          this.canLoadMore = true;
          this.filterActivites();
        }
        this.activities.push(...c.activities);
      }),
    );
  }

  filterActivites(): Observable<Activity[]> {
    if (this.filterValue === Activity_Type.ALL)
      return;
    else
     return this.activities$.pipe(
       map((c: Activity[]) => {
         return c.filter((value => value.type === this.filterValue));
       }),
      );
  }

}
