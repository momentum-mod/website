import { Component, Input, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { ActivityService } from '@momentum/frontend/data';
import { ActivityType } from '@momentum/constants';
import { Activity, PagedResponse, User } from '@momentum/types';

@Component({
  selector: 'mom-activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss']
})
export class ActivityCardComponent implements OnInit {
  @Input() headerTitle: string;
  @Input() follow: boolean;
  @Input() recent: boolean;
  @Input() userSubject: ReplaySubject<User>;

  constructor(private activityService: ActivityService) {
    this.headerTitle = 'Activity';
    this.filterValue = ActivityType.ALL;
    this.activities = [];
    this.filteredActivities = [];
    this.initialActivity = false;
    this.canLoadMore = true;
  }
  protected readonly ActivityType = ActivityType;
  filterValue: ActivityType;
  activities: Activity[];
  filteredActivities: Activity[];
  initialActivity: boolean;
  recentActPage = 1;
  canLoadMore: boolean;

  ngOnInit(): void {
    if (!this.initialActivity) this.getActivities();
  }

  filterActivites(acts: Activity[]): void {
    this.filteredActivities =
      this.filterValue === this.ActivityType.ALL
        ? acts
        : acts.filter((value) => value.type === this.filterValue);
  }

  onGetActivities(response: PagedResponse<Activity>): void {
    this.initialActivity = true;
    this.activities = response.response;
    this.filterActivites(this.activities);
  }

  getActivities(): void {
    if (this.follow)
      this.activityService
        .getFollowedActivity()
        .subscribe(this.onGetActivities.bind(this));
    else if (this.userSubject)
      this.userSubject.subscribe((user) =>
        this.activityService
          .getUserActivity(user.id)
          .subscribe(this.onGetActivities.bind(this))
      );
    else if (this.recent)
      this.activityService
        .getRecentActivity({ skip: 0 })
        .subscribe(this.onGetActivities.bind(this));
  }

  getMoreActivities(): void {
    if (!this.canLoadMore || !this.recent) return;
    this.canLoadMore = false;
    this.activityService
      .getRecentActivity({ skip: 10 * this.recentActPage++ })
      .subscribe((response) => {
        // Don't call the API anymore if there are no more activities left
        if (response.response.length > 0) {
          this.canLoadMore = true;
          this.activities.push(...response.response);
          this.filterActivites(this.activities);
        }
      });
  }
}
