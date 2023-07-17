import { Component, Input, OnInit } from '@angular/core';
import { Icon } from '@momentum/frontend/icons';
import { Activity } from '@momentum/constants';
import { ActivityType } from '@momentum/constants';

@Component({
  selector: 'mom-activity-content',
  templateUrl: './activity-content.component.html',
  styleUrls: ['./activity-content.component.scss']
})
export class ActivityContentComponent implements OnInit {
  @Input() activity: Activity;
  /**
   * Whether the date should have display property set to none
   * and limit content width on md media query (for notifications)
   */
  @Input() dateNone: boolean;
  activityIcon: Icon;
  actionText: string;
  eventText: string;
  eventColor: string;
  eventLink: string;
  constructor() {
    this.actionText = '';
    this.eventText = '';
    this.eventLink = null;
    this.dateNone = false;
  }

  ngOnInit() {
    switch (this.activity.type) {
      case ActivityType.MAP_UPLOADED:
        this.actionText = ' uploaded a new ';
        this.eventText = 'map';
        this.activityIcon = 'panorama-outline';
        this.eventColor = 'purple';
        break;
      case ActivityType.MAP_APPROVED:
        this.actionText = ' added a new ';
        this.eventText = 'map';
        this.activityIcon = 'panorama-outline';
        this.eventColor = 'green';
        this.eventLink = '/dashboard/maps/' + this.activity.data;
        break;
      case ActivityType.WR_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'world record';
        this.activityIcon = 'earth';
        this.eventColor = 'yellow';
        this.eventLink = '/dashboard/runs/' + this.activity.data;
        break;
      case ActivityType.PB_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'personal best';
        this.activityIcon = 'trophy';
        this.eventColor = 'silver';
        this.eventLink = '/dashboard/runs/' + this.activity.data;
        break;
      case ActivityType.USER_JOINED:
        this.actionText = ' has ';
        this.eventText = 'joined';
        this.activityIcon = 'account-multiple-outline';
        this.eventColor = 'orange';
        break;
      default:
        break;
    }
  }
}
