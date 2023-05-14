import { Component, Input, OnInit } from '@angular/core';
import { NotificationsService } from '../../../services/notifications.service';
import { Notification } from '@momentum/types';

@Component({
  selector: 'mom-notifications',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  @Input() notifications: Notification[];

  constructor(private notificationService: NotificationsService) {}

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
