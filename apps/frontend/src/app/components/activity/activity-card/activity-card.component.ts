import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActivityService } from '@momentum/frontend/data';
import { ActivityType } from '@momentum/constants';
import { Activity, PagedResponse, User } from '@momentum/constants';
import { ActivityListComponent } from '../activity-list/activity-list.component';
import { NbSelectModule, NbOptionModule } from '@nebular/theme';
import { CardComponent } from '../../card/card.component';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'm-activity-card',
  templateUrl: './activity-card.component.html',
  standalone: true,
  imports: [
    NbSelectModule,
    NbOptionModule,
    ActivityListComponent,
    CardComponent,
    DropdownModule,
    FormsModule
  ]
})
export class ActivityCardComponent implements OnInit {
  protected readonly Types = [
    { value: ActivityType.ALL, label: 'All' },
    { value: ActivityType.MAP_APPROVED, label: 'Maps Only' },
    { value: ActivityType.PB_ACHIEVED, label: 'PBs Only' },
    { value: ActivityType.WR_ACHIEVED, label: 'WRs Only' }
  ];

  @Input() headerTitle = 'Activity';
  @Input() follow: boolean;
  @Input() recent: boolean;
  @Input() userSubject: BehaviorSubject<User>;

  filterValue: ActivityType = ActivityType.ALL;
  activities: Activity[] = [];
  filteredActivities: Activity[] = [];
  initialActivity = false;
  recentActPage = 1;
  canLoadMore = true;

  constructor(private readonly activityService: ActivityService) {}

  ngOnInit(): void {
    if (!this.initialActivity) this.getActivities();
  }

  filterActivites(acts: Activity[]): void {
    this.filteredActivities =
      this.filterValue === ActivityType.ALL
        ? acts
        : acts.filter((value) => value.type === this.filterValue);
  }

  onGetActivities(response: PagedResponse<Activity>): void {
    this.initialActivity = true;
    this.activities = response.data;
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
        if (response.data.length > 0) {
          this.canLoadMore = true;
          this.activities.push(...response.data);
          this.filterActivites(this.activities);
        }
      });
  }
}
