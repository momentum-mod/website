import { Component, Input, OnInit, inject } from '@angular/core';
import { Notification } from '@momentum/constants';
import { NotificationsService } from '../../services/notifications.service';
import { ActivityContentComponent } from '../activity/activity-content.component';
import { NgClass } from '@angular/common';
import { IconComponent } from '../../icons';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

@Component({
  selector: 'm-notifications',
  templateUrl: './notification.component.html',
  imports: [ActivityContentComponent, NgClass, IconComponent, TimeAgoPipe]
})
export class NotificationComponent implements OnInit {
  private readonly notificationService = inject(NotificationsService);

  @Input() notifications: Notification[];

  // This gets called every time the bell is clicked (to view notifications)
  ngOnInit() {
    this.notifications.sort((a: Notification, b: Notification) => {
      if (!a.read) {
        return !b.read ? 0 : -1;
      } else if (!b.read) {
        return 1;
      } else {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });
  }

  readNotif(notif: Notification) {
    if (!notif.read) {
      notif.read = true;
      this.notificationService.markNotificationAsRead(notif);
    }
  }
  onClickNotif(notif: Notification) {
    this.readNotif(notif);
  }
  onHoverNotif(notif: Notification) {
    this.readNotif(notif);
  }

  removeNotif(notification: Notification) {
    this.notifications.splice(
      this.notifications.findIndex((notif) => notif.id === notification.id),
      1
    );
    this.notificationService.dismissNotification(notification);
  }
}
