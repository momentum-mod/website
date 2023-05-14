import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { NbToastrService } from '@nebular/theme';
import { env } from '@momentum/frontend/env';
import { Notification } from '@momentum/types';
import { AuthService } from '@momentum/frontend/data';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  notificationsSubject: ReplaySubject<Notification[]>;

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
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
      this.http
        .get<any>(env.api + '/api/user/notifications')
        .subscribe((resp) =>
          this.notificationsSubject.next(resp.notifications)
        );
  }
  get notifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  markNotificationAsRead(notification: Notification) {
    this.http
      .patch(env.api + '/api/user/notifications/' + notification.id, {
        read: true
      })
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
    this.http
      .delete(env.api + '/api/user/notifications/' + notif.id, {
        responseType: 'text'
      })
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
