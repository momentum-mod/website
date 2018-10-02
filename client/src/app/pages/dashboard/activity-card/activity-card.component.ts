import {Component, Input} from '@angular/core';
import {Activity, Activity_Type, MapActivityData} from './activity';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
})

export class ActivityCardComponent {
  @Input('header') headerTitle: string;

  constructor() {
    this.headerTitle = 'Activity';
    this.activities = this.activitiesAll;
    this.filterValue = Activity_Type.ALL;
  }
  activityType = Activity_Type;
  filterValue: Activity_Type;

  // TODO use a service for the following
  activitiesAll: Activity[] = [
    new Activity(Activity_Type.MAP_UPLOADED, 1, new MapActivityData(1)),
  ];
  activities: Activity[];
  getActivities(): Activity[] {
    if (this.filterValue === this.activityType.ALL)
      return this.activitiesAll;

    return this.activitiesAll.filter((value => value.type === this.filterValue));
  }
  filterSelected(value: string) {
    this.filterValue = Number(value);
    this.activities = this.getActivities();
  }
}
