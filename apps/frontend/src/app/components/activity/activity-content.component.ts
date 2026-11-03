import { Component, computed, input } from '@angular/core';
import { Activity, ActivityType } from '@momentum/constants';
import { Icon, IconComponent } from '../../icons';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../avatar/avatar.component';
import { NgClass, NgStyle } from '@angular/common';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

interface ActivityDisplay {
  actionText: string;
  eventText: string;
  icon: Icon | undefined;
  color: string | undefined;
  link: string | null;
}

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
export class ActivityContentComponent {
  readonly activity = input<Activity>();
  /**
   * Whether the date should have display property set to none
   * and limit content width on md media query (for notifications)
   */
  readonly dateNone = input(false);
  protected readonly display = computed<ActivityDisplay>(() => {
    const activity = this.activity();
    switch (activity.type) {
      case ActivityType.MAP_UPLOADED:
        return {
          actionText: ' uploaded a new ',
          eventText: 'map',
          icon: 'panorama-outline',
          color: 'indigo-400',
          link: null
        };
      case ActivityType.MAP_APPROVED:
        return {
          actionText: ' added a new ',
          eventText: 'map',
          icon: 'panorama-outline',
          color: 'green-500',
          link: '/maps/' + activity.data
        };
      case ActivityType.WR_ACHIEVED:
        return {
          actionText: ' achieved a ',
          eventText: 'world record',
          icon: 'earth',
          color: 'yellow-500',
          link: '/runs/' + activity.data
        };
      case ActivityType.PB_ACHIEVED:
        return {
          actionText: ' achieved a ',
          eventText: 'personal best',
          icon: 'trophy',
          color: 'gray-300',
          link: '/runs/' + activity.data
        };
      case ActivityType.USER_JOINED:
        return {
          actionText: ' has ',
          eventText: 'joined',
          icon: 'account-multiple-outline',
          color: 'blue-400',
          link: null
        };
      default:
        return {
          actionText: '',
          eventText: '',
          icon: undefined,
          color: undefined,
          link: null
        };
    }
  });
}
