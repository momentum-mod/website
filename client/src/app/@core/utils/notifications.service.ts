import {Injectable} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {Observable, ReplaySubject} from 'rxjs';
import {SiteNotification} from '../models/notification.model';
import {Activity_Type} from '../models/activity-type.model';


@Injectable()
export class NotificationsService {
  notifications$: ReplaySubject<SiteNotification[]>;
  constructor(private router: Router,
              private http: HttpClient) {
    this.notifications$ = new ReplaySubject<SiteNotification[]>();
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
    this.notifications$.next([
      {
        id: 1,
        forUser: {
          id: '1',
          permissions: 0,
        },
        activity: {
          id: 1,
          userID: '1',
          type: Activity_Type.WR_ACHIEVED,
          data: 'lol',
        },
        read: false,
      },
    ]);
    // this.http.get('/api/user/notifications').subscribe(resp => {this.notifications.next(resp.notifications})
  }
  get notifications(): Observable<SiteNotification[]> { return this.notifications$.asObservable(); }

  markNotificationAsRead(notification: SiteNotification) {
    this.http.patch('/api/user/notifications/' + notification.id, {read: false});
  }
}
