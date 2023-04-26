import { Component, Input, OnInit } from '@angular/core';
import { ActivityService } from '../../../../@core/data/activity.service';
import { Activity_Type } from '../../../../@core/models/activity-type.model';
import { Activity } from '../../../../@core/models/activity.model';
import { ReplaySubject } from 'rxjs';
import { User } from '../../../../@core/models/user.model';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss']
})
export class ActivityCardComponent implements OnInit {
  @Input() headerTitle: string;
  @Input() follow: boolean;
  @Input() recent: boolean;
  @Input() userSubj: ReplaySubject<User>;

  constructor(private actService: ActivityService) {
    this.headerTitle = 'Activity';
    this.filterValue = Activity_Type.ALL;
    this.initialAct = false;
    this.activities = [];
    this.actsFiltered = [];
  }
  activityType = Activity_Type;
  filterValue: Activity_Type;
  activities: Activity[];
  actsFiltered: Activity[];
  initialAct: boolean;
  recentActPage = 1;
  canLoadMore = true;

  ngOnInit(): void {
    if (!this.initialAct) {
      this.getActivities();
    }
  }

  filterActivites(acts: Activity[]): void {
    if (this.filterValue === this.activityType.ALL) this.actsFiltered = acts;
    else
      this.actsFiltered = acts.filter(
        (value) => value.type === this.filterValue
      );
  }

  getActivities(): void {
    const func = (resp) => {
      this.initialAct = true;
      this.activities = resp.activities;
      this.filterActivites(this.activities);
    };
    if (this.follow) this.actService.getFollowedActivity().subscribe(func);
    else if (this.userSubj)
      this.userSubj.subscribe((usr) => {
        this.actService.getUserActivity(usr.id).subscribe(func);
      });
    else if (this.recent) this.actService.getRecentActivity(0).subscribe(func);
  }

  getMoreActivities(): void {
    if (!this.canLoadMore || !this.recent) return;

    this.canLoadMore = false;
    this.actService
      .getRecentActivity(10 * this.recentActPage++)
      .subscribe((res) => {
        // Don't call the API anymore if there are no more activities left
        if (res.activities.length > 0) {
          this.canLoadMore = true;
          this.activities.push(...res.activities);
          this.filterActivites(this.activities);
        }
      });
  }
}
