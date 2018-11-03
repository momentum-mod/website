import {Component, Input, OnInit} from '@angular/core';
import {NotificationsService} from '../../@core/utils/notifications.service';
import {SiteNotification} from '../../@core/models/notification.model';

@Component({
  selector: 'notifications',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit {

  @Input('notifications') notifications: SiteNotification[];

  constructor(private notificationService: NotificationsService) { }

  ngOnInit() {
    // This gets called every time the bell is clicked (to view notifications)
  }
  onClickNotification(notif: SiteNotification) {
    if (!notif.read) {
      notif.read = true;
      this.notificationService.markNotificationAsRead(notif);
    }
  }
  onHoverNotif(notif: SiteNotification) {
    if (!notif.read) {
      notif.read = true;
      this.notificationService.markNotificationAsRead(notif);
    }
  }

  removeNotifcation(notification: SiteNotification) {
    this.notifications.splice(this.notifications.findIndex(notif => notif.id === notification.id), 1);
    this.notificationService.dismissNotification(notification);
  }
}
