import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, finalize } from 'rxjs/operators';
import { Observable, ReplaySubject } from 'rxjs';
import { NbToastrService } from '@nebular/theme';
import { Notification } from '@momentum/types';
import { AuthService, LocalUserService } from '@momentum/frontend/data';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  notificationsSubject: ReplaySubject<Notification[]>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private localUserService: LocalUserService,
    private toasterService: NbToastrService
  ) {
    this.notificationsSubject = new ReplaySubject<Notification[]>(1);
  }

  public inject(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.checkNotifications());
    setInterval(() => {
      if (document.hasFocus()) this.checkNotifications();
    }, 1000 * 60 * 3);
  }

  checkNotifications() {
    if (this.authService.isAuthenticated())
      this.localUserService.getNotifications().subscribe((resp) => {
        if (resp) this.notificationsSubject.next(resp.response);
      });
  }

  get notifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  markNotificationAsRead(notification: Notification) {
    this.localUserService
      .updateNotification(notification.id, { read: true })
      .pipe(finalize(() => this.checkNotifications()))
      .subscribe({
        error: (error) =>
          this.toasterService.danger(
            error.message,
            'Could not mark notification as read'
          )
      });
  }

  dismissNotification(notif: Notification) {
    this.localUserService
      .deleteNotification(notif.id)
      .pipe(finalize(() => this.checkNotifications()))
      .subscribe({
        error: (error) =>
          this.toasterService.danger(
            error.message,
            'Could not dismiss notification'
          )
      });
  }
}
