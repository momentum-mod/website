import {Injectable} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter, finalize} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {Observable, ReplaySubject} from 'rxjs';
import {SiteNotification} from '../models/notification.model';
import {ToasterService} from 'angular2-toaster';


@Injectable()
export class NotificationsService {
  notifications$: ReplaySubject<SiteNotification[]>;

  constructor(private router: Router,
              private http: HttpClient,
              private toasterService: ToasterService) {
    this.notifications$ = new ReplaySubject<SiteNotification[]>(1);
  }
  public inject(): void {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
    )
      .subscribe(() => {
        this.checkNotifications();
      });
  }
  checkNotifications() {
    this.http.get<any>('/api/user/notifications').subscribe(resp => this.notifications$.next(resp.notifications));
  }
  get notifications(): Observable<SiteNotification[]> { return this.notifications$.asObservable(); }

  markNotificationAsRead(notification: SiteNotification) {
    this.http.patch('/api/user/notifications/' + notification.id, {read: true})
      .pipe(finalize(() => this.checkNotifications()))
      .subscribe(resp => {
    }, err => {
      this.toasterService.popAsync('error', 'Could not mark notification as read', err.message);
    });
  }
  dismissNotification(notif: SiteNotification) {
    this.http.delete('/api/user/notifications/' + notif.id, { responseType: 'text'})
      .pipe(finalize(() => this.checkNotifications()))
      .subscribe(resp => {
    }, err => {
      this.toasterService.popAsync('error', 'Could not dismiss notification', err.message);
    });
  }
}
