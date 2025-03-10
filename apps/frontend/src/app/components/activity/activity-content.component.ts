import { Component, Input, OnInit } from '@angular/core';
import { Activity, ActivityType } from '@momentum/constants';
import { Icon, IconComponent } from '../../icons';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../avatar/avatar.component';
import { NgClass, NgStyle } from '@angular/common';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

@Component({
  selector: 'm-activity-content',
  imports: [
    RouterLink,
    AvatarComponent,
    NgStyle,
    NgClass,
    IconComponent,
    TimeAgoPipe
  ],
  templateUrl: './activity-content.component.html'
})
export class ActivityContentComponent implements OnInit {
  @Input() activity: Activity;
  /**
   * Whether the date should have display property set to none
   * and limit content width on md media query (for notifications)
   */
  @Input() dateNone = false;
  activityIcon: Icon;
  actionText = '';
  eventText = '';
  eventColor: string;
  eventLink = null;

  ngOnInit() {
    switch (this.activity.type) {
      case ActivityType.MAP_UPLOADED:
        this.actionText = ' uploaded a new ';
        this.eventText = 'map';
        this.activityIcon = 'panorama-outline';
        this.eventColor = 'indigo-400';
        break;
      case ActivityType.MAP_APPROVED:
        this.actionText = ' added a new ';
        this.eventText = 'map';
        this.activityIcon = 'panorama-outline';
        this.eventColor = 'green-500';
        this.eventLink = '/maps/' + this.activity.data;
        break;
      case ActivityType.WR_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'world record';
        this.activityIcon = 'earth';
        this.eventColor = 'yellow-500';
        this.eventLink = '/runs/' + this.activity.data;
        break;
      case ActivityType.PB_ACHIEVED:
        this.actionText = ' achieved a ';
        this.eventText = 'personal best';
        this.activityIcon = 'trophy';
        this.eventColor = 'gray-300';
        this.eventLink = '/runs/' + this.activity.data;
        break;
      case ActivityType.USER_JOINED:
        this.actionText = ' has ';
        this.eventText = 'joined';
        this.activityIcon = 'account-multiple-outline';
        this.eventColor = 'blue-400';
        break;
      default:
        break;
    }
  }
}
