import { Component, Input, OnInit } from '@angular/core';
import { SiteNotification } from '../../../@core/models/notification.model';
import { NotificationsService } from '../../../@core/utils/notifications.service';

@Component({
  selector: 'notifications',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  @Input('notifications') notifications: SiteNotification[];

  constructor(private notificationService: NotificationsService) {}

  // This gets called every time the bell is clicked (to view notifications)
  ngOnInit() {
    this.notifications.sort((a: SiteNotification, b: SiteNotification) => {
      if (!a.read) {
        if (!b.read) {
          return 0;
        } else {
          return -1;
        }
      } else if (!b.read) {
        return 1;
      } else {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });
  }
  readNotif(notif: SiteNotification) {
    if (!notif.read) {
      notif.read = true;
      this.notificationService.markNotificationAsRead(notif);
    }
  }
  onClickNotif(notif: SiteNotification) {
    this.readNotif(notif);
  }
  onHoverNotif(notif: SiteNotification) {
    this.readNotif(notif);
  }

  removeNotif(notification: SiteNotification) {
    this.notifications.splice(
      this.notifications.findIndex((notif) => notif.id === notification.id),
      1
    );
    this.notificationService.dismissNotification(notification);
  }
}
