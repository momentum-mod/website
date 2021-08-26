import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import {ActivityStoreService} from '../../../../@core/data/activity/activity-store.service';
import {Activity_Type} from '../../../../@core/models/activity-type.model';
import {Activity} from '../../../../@core/models/activity.model';
import { ReplaySubject, Subject } from 'rxjs';
import {User} from '../../../../@core/models/user.model';
import { takeUntil, map } from 'rxjs/operators';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
})
export class ActivityCardComponent implements OnInit, OnDestroy {
  @Input('header') headerTitle: string;
  @Input('follow') follow: boolean;
  @Input('recent') recent: boolean;
  @Input('userSubj') userSubj$: ReplaySubject<User>;

  destroy$ = new Subject();

  constructor(
    private actStore: ActivityStoreService,
  ) {
    this.headerTitle = 'Activity';
    this.initialAct = false;
    this.activities = [];
  }
  activities: Activity[];
  initialAct: boolean;
  recentActPage = 1;
  canLoadMore = true;

  ngOnInit(): void {
    this.actStore.activities$.pipe(
      takeUntil(this.destroy$),
      map(c => {
        if(c) {
          this.activities = c;
        } else {
          this.getActivities();
          this.initialAct = true;
        }
      }),
    ).subscribe();
  }

  getActivities(): void {
    if (this.follow){
      this.actStore.getFollowedActivity();

    } else if (this.userSubj$) {
      this.userSubj$.pipe(
        takeUntil(this.destroy$),
        map(c => {
          this.actStore.getUserActivity(c.id);
        }),
      ).subscribe();

    } else if (this.recent){
      this.actStore.getRecentActivity(0);
    }
  }

  getMoreActivities(): void {
    if(!this.actStore.canLoadMore) {
      return;
    }

    this.actStore.getRecentActivity(10 * this.recentActPage++);
  }

  updateFilter(filterValue: Activity_Type): void {
    this.actStore.filterValue = filterValue;
    this.actStore.filterActivites();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
