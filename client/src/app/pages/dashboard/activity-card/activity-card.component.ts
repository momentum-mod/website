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
  }
  activityType = Activity_Type;

  filterValue: Activity_Type = 0;

  // TODO use a service for these
  activitiesAll: Activity[] = [
    new Activity(Activity_Type.MAP_UPLOADED, 1, new MapActivityData(1)),
  ];
  activities: Activity[];
  getActivities(): Activity[] {
    if (this.filterValue > 0) {
      return this.activitiesAll.filter((value => value.type === this.filterValue));
    } else {
      return this.activitiesAll;
    }
  }
  // TODO figure out why this doesn't work
  filterSelected(value: Activity_Type) {
    this.filterValue = value;
    /*console.log('Check ' + value);
    console.log('Before: ');
    console.log(this.activities);*/
    this.activities = this.getActivities();
    // console.log(this.activities);
  }
}
