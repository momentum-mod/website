import {Component, Input, OnInit} from '@angular/core';
import {Activity, Activity_Type} from './activity';
import {ActivityService} from '../../../@core/data/activity.service';

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
    if (this._user) {
      this.getActivities();
      this.initialAct = true;
    }
  }
  _user: string;

  constructor(private actService: ActivityService) {
    this.headerTitle = 'Activity';
    this.filterValue = Activity_Type.ALL;
    this.initialAct = false;
  }
  activityType = Activity_Type;
  filterValue: Activity_Type;
  activities: Activity[];
  initialAct: boolean;

  ngOnInit(): void {
    if (!this.initialAct) {
      this.getActivities();
      this.initialAct = true;
    }
  }

  filterActivites(acts: Activity[]): void {
      if (this.filterValue === this.activityType.ALL)
        this.activities = acts;
      else
        this.activities = acts.filter((value => value.type === this.filterValue));
  }
  getActivities(): void {
    if (this.follow)
      this.actService.getFollowedActivity().subscribe(acts => this.filterActivites(acts));
    else if (this._user)
      this.actService.getUserActivity(this._user).subscribe(acts => this.filterActivites(acts));
    else if (this.recent)
      this.actService.getRecentActivity().subscribe(acts => this.filterActivites(acts));
  }
  filterSelected(value: string) {
    this.filterValue = Number(value);
    this.filterActivites(this.activities);
  }
}
