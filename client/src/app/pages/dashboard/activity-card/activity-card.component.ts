import {Component, Input, OnInit} from '@angular/core';
import {Activity, Activity_Type} from './activity';
import {ActivityService} from '../../../@core/data/activity.service';
import {Observable} from 'rxjs';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
})
export class ActivityCardComponent implements OnInit {
  @Input('header') headerTitle: string;
  @Input('follow') follow: boolean;
  @Input('recent') recent: boolean;
  @Input('userID')
  set user(user: string) {
    this._user = user;
    if (this._user)
      this.getActivities();
  }
  _user: string;

  constructor(private actService: ActivityService) {
    this.headerTitle = 'Activity';
    this.filterValue = Activity_Type.ALL;
  }
  activityType = Activity_Type;
  filterValue: Activity_Type;
  activities: Activity[];

  ngOnInit(): void {
    this.getActivities();
  }

  filterActivites(acts: Activity[]): void {
      if (this.filterValue === this.activityType.ALL)
        this.activities = acts;
      else
        this.activities = acts.filter((value => value.type === this.filterValue));
  }
  getActivities(): void {
    let observable: Observable<Activity[]> = null;
    if (this.follow)
      observable = this.actService.getFollowedActivity();
    else if (this._user)
      observable = this.actService.getUserActivity(this._user);
    else if (this.recent)
      observable = this.actService.getRecentActivity();

    if (observable)
      observable.subscribe(acts => {
        this.filterActivites(acts);
      });
  }
  filterSelected(value: string) {
    this.filterValue = Number(value);
    this.filterActivites(this.activities);
  }
}
