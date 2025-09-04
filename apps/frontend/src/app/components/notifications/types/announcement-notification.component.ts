import { Component, input, output } from '@angular/core';
import { AnnouncementNotification } from '@momentum/constants';
import { IconComponent } from '../../../icons';

@Component({
  selector: 'm-announcement-notification',
  template: `
    <div class="notification-card-title">
      <m-icon icon="bullhorn" class="notification-type-icon" />
      <p>Announcement!</p>
      <button type="button" class="dismiss-button" (click)="dismiss.emit()">
        <m-icon icon="close" />
      </button>
    </div>
    <div class="notification-card-main">
      <p>{{ notification().message }}</p>
    </div>
  `,
  host: { class: 'notification-card' },
  imports: [IconComponent]
})
export class AnnouncementNotificationComponent {
  notification = input.required<AnnouncementNotification>();

  dismiss = output();
}
