import {Injectable} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter, finalize} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {Observable, ReplaySubject} from 'rxjs';
import {SiteNotification} from '../models/notification.model';
import {AuthService} from '../data/auth.service';
import {NbToastrService} from '@nebular/theme';


@Injectable()
export class NotificationsService {
  notifications$: ReplaySubject<SiteNotification[]>;

  constructor(private router: Router,
              private http: HttpClient,
              private authService: AuthService,
              private toasterService: NbToastrService) {
    this.notifications$ = new ReplaySubject<SiteNotification[]>(1);
  }
  public inject(): void {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
    )
      .subscribe(() => {
        this.checkNotifications();
      });
    setInterval(() => {
      if (document.hasFocus())
        this.checkNotifications();
    }, 1000 * 60 * 3);
  }
  checkNotifications() {
    if (this.authService.isAuthenticated())
      this.http.get<any>('/api/user/notifications').subscribe(resp => this.notifications$.next(resp.notifications));
  }
  get notifications(): Observable<SiteNotification[]> { return this.notifications$.asObservable(); }

  markNotificationAsRead(notification: SiteNotification) {
    this.http.patch('/api/user/notifications/' + notification.id, {read: true})
      .pipe(finalize(() => this.checkNotifications()))
      .subscribe(resp => {
    }, err => {
        this.toasterService.danger(err.message, 'Could not mark notification as read');
    });
  }
  dismissNotification(notif: SiteNotification) {
    this.http.delete('/api/user/notifications/' + notif.id, { responseType: 'text'})
      .pipe(finalize(() => this.checkNotifications()))
      .subscribe(resp => {
    }, err => {
        this.toasterService.danger(err.message, 'Could not dismiss notification');
    });
  }
}
