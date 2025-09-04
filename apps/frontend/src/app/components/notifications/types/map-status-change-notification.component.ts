import { Component, input, output } from '@angular/core';
import {
  MapStatus,
  MapStatusChangeNotification,
  MapStatusName
} from '@momentum/constants';
import { IconComponent } from '../../../icons';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-map-status-change-notification',
  template: `
    <div class="notification-card-title">
      <m-icon icon="forward" class="notification-type-icon" />
      <p>A Map Changed Status</p>
      <button type="button" class="dismiss-button" (click)="dismiss.emit()">
        <m-icon icon="close" />
      </button>
    </div>
    <div class="notification-card-main">
      <p>
        <a
          [routerLink]="'/maps/' + notification().map.name"
          class="font-bold link"
          >{{ notification().map.name }}</a
        >
        went from
        <span [ngClass]="statusColorClass(notification().oldStatus)">{{
          MapStatusName.get(notification().oldStatus)
        }}</span>
        to
        <span [ngClass]="statusColorClass(notification().newStatus)">{{
          MapStatusName.get(notification().newStatus)
        }}</span>
      </p>
    </div>
  `,
  host: { class: 'notification-card' },
  // Colors correspond to tailwind,
  // but can't use it as it get removed by tree shaking.
  // TODO: use safelist when we have moved to Tailwind V4.
  styles: `
    .disabled {
      color: rgb(223 139 142); /* text-red-300 */
    }
    .content-approval {
      color: rgb(243 189 119); /* text-orange-300 */
    }
    .private-testing {
      color: rgb(189 148 250); /* text-purple-300 */
    }
    .public-testing {
      color: rgb(117 202 245); /* text-blue-300 */
    }
    .final-approval {
      color: rgb(252, 211, 77); /* text-amber-300 */
    }
    .approved {
      color: rgb(190, 242, 100); /* text-lime-300 */
    }
  `,
  imports: [NgClass, RouterLink, IconComponent]
})
export class MapStatusChangeNotificationComponent {
  protected readonly MapStatusName = MapStatusName;

  notification = input.required<MapStatusChangeNotification>();

  dismiss = output();

  statusColorClass(status: MapStatus) {
    switch (status) {
      case MapStatus.DISABLED:
        return 'disabled';
      case MapStatus.CONTENT_APPROVAL:
        return 'content-approval';
      case MapStatus.PRIVATE_TESTING:
        return 'private-testing';
      case MapStatus.PUBLIC_TESTING:
        return 'public-testing';
      case MapStatus.FINAL_APPROVAL:
        return 'final-approval';
      case MapStatus.APPROVED:
        return 'approved';
      default:
        return '';
    }
  }
}
