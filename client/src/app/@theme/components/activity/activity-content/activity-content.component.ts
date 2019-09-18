import {Component, Input, OnInit} from '@angular/core';
import {Activity} from '../../../../@core/models/activity.model';
import {Activity_Type} from '../../../../@core/models/activity-type.model';

@Component({
  selector: 'activity-content',
  templateUrl: './activity-content.component.html',
  styleUrls: ['./activity-content.component.scss'],
})
export class ActivityContentComponent implements OnInit {

  @Input('activity') activity: Activity;
  /**
   * Whether the date should have display property set to none
   * and limit content width on md media query (for notifications)
   */
  @Input('date-non') dateNon: boolean;
  activityIcon: string;
  actionText: string;
  eventText: string;
  eventColor: string;
  eventLink: string;
  constructor() {
    this.activityIcon = '';
    this.actionText = '';
    this.eventText = '';
    this.eventLink = null;
    this.dateNon = false;
  }

  ngOnInit() {
    switch (this.activity.type) {
      case Activity_Type.MAP_UPLOADED:
        this.actionText = ' uploaded a new ';
        this.eventText = 'map';
        this.activityIcon = 'ion ion-map';
        this.eventColor = 'purple';
        break;
      case Activity_Type.MAP_APPROVED:
        this.actionText = ' added a new ';
        this.eventText = 'map';
        this.activityIcon = 'ion ion-map';
        this.eventColor = 'green';
        this.eventLink = '/dashboard/maps/' + this.activity.data;
        break;
      case Activity_Type.WR_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'world record';
        this.activityIcon = 'ion ion-android-globe';
        this.eventColor = 'yellow';
        this.eventLink = '/dashboard/runs/' + this.activity.data;
        break;
      case Activity_Type.PB_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'personal best';
        this.activityIcon = 'ion ion-trophy';
        this.eventColor = 'silver';
        this.eventLink = '/dashboard/runs/' + this.activity.data;
        break;
      case Activity_Type.USER_JOINED:
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
