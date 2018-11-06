import {Component, Input, OnInit} from '@angular/core';
import {ActivityService} from '../../../../@core/data/activity.service';
import {Activity_Type} from '../../../../@core/models/activity-type.model';
import {Activity} from '../../../../@core/models/activity.model';
import {ReplaySubject} from 'rxjs';
import {User} from '../../../../@core/models/user.model';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
})
export class ActivityCardComponent implements OnInit {
  @Input('header') headerTitle: string;
  @Input('follow') follow: boolean;
  @Input('recent') recent: boolean;
  @Input('userSubj') userSubj$: ReplaySubject<User>;

  constructor(private actService: ActivityService) {
    this.headerTitle = 'Activity';
    this.filterValue = Activity_Type.ALL;
    this.initialAct = false;
    this.activities = [];
  }
  activityType = Activity_Type;
  filterValue: Activity_Type;
  activities: Activity[];
  initialAct: boolean;

  ngOnInit(): void {
    if (!this.initialAct) {
      this.getActivities();
    }
  }

  filterActivites(acts: Activity[]): void {
    if (this.filterValue === this.activityType.ALL)
      this.activities = acts;
    else
      this.activities = acts.filter((value => value.type === this.filterValue));
  }
  getActivities(): void {
    const func = (resp) => {
      this.initialAct = true;
      this.filterActivites(resp.activities);
    };
    if (this.follow)
      this.actService.getFollowedActivity().subscribe(func);
    else if (this.userSubj$)
      this.userSubj$.subscribe(usr => {
        this.actService.getUserActivity(usr.id).subscribe(func);
      });
    else if (this.recent)
      this.actService.getRecentActivity().subscribe(func);
  }
  filterSelected(value: string) {
    this.filterValue = Number(value);
    this.filterActivites(this.activities);
  }
}
