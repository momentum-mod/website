import {Component, Input, OnInit} from '@angular/core';
import {Activity} from '../../../@core/models/activity.model';
import {Activity_Type} from '../../../@core/models/activity-type.model';

@Component({
  selector: 'activity-content',
  templateUrl: './activity-content.component.html',
  styleUrls: ['./activity-content.component.scss'],
})
export class ActivityContentComponent implements OnInit {

  @Input('activity') activity: Activity;
  activityIcon: string;
  actionText: string;
  eventText: string;
  eventColor: string;
  constructor() {
    this.activityIcon = '';
    this.actionText = '';
    this.eventText = '';
  }

  ngOnInit() {
    switch (this.activity.type) {
      case Activity_Type.MAP_SUBMITTED:
        this.actionText = ' uploaded a new ';
        this.eventText = 'map';
        this.activityIcon = 'ion ion-map';
        this.eventColor = 'purple';
        break;
      case Activity_Type.WR_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'world record';
        this.activityIcon = 'ion ion-android-globe';
        this.eventColor = 'yellow';
        break;
      case Activity_Type.PB_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'personal best';
        this.activityIcon = 'ion ion-trophy';
        this.eventColor = 'silver';
        break;
      case Activity_Type.USER_JOIN:
        this.actionText = ' has ';
        this.eventText = 'joined';
        this.activityIcon = 'ion ion-android-contacts';
        this.eventColor = 'orange';
        break;
      default:
        break;
    }
  }
}
