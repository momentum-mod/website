import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  filter,
  finalize,
  repeat,
  switchMap,
  tap,
  throttleTime
} from 'rxjs/operators';
import { Observable, ReplaySubject, timer } from 'rxjs';
import { Notification } from '@momentum/constants';
import { AuthService, LocalUserService } from '../services';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  notificationsSubject: ReplaySubject<Notification[]> = new ReplaySubject<
    Notification[]
  >(1);

  constructor(
    private router: Router,
    private authService: AuthService,
    private localUserService: LocalUserService,
    private messageService: MessageService
  ) {}

  inject() {
    // this.checkNotifications();

    // Fetch notifications after each page load, so long as
    // user hasn't previously switched page in last 10 seconds. Then refreshes
    // every 3 minutes so long as user stays on page.
    // TODO: Clean this up some more, have other checkNotification calls reset
    // timer.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        throttleTime(10 * 1000)
      )
      .pipe(
        switchMap(() => {
          this.checkNotifications();
          return timer(180 * 1000).pipe(
            tap(() => this.checkNotifications()),
            repeat()
          );
        })
      )
      .subscribe();
  }

  checkNotifications() {
    if (!this.authService.isAuthenticated()) return;
    this.localUserService.getNotifications().subscribe((resp) => {
      if (resp) this.notificationsSubject.next(resp.data);
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
          this.messageService.add({
            severity: 'error',
            summary: 'Could not mark notification as read',
            detail: error.message
          })
      });
  }

  dismissNotification(notif: Notification) {
    this.localUserService
      .deleteNotification(notif.id)
      .pipe(finalize(() => this.checkNotifications()))
      .subscribe({
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Could not dismiss notification',
            detail: error.message
          })
      });
  }
}
