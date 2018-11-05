import {Injectable} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter, finalize} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {Observable, ReplaySubject} from 'rxjs';
import {SiteNotification} from '../models/notification.model';
import {Activity_Type} from '../models/activity-type.model';
import {ToasterService} from 'angular2-toaster';


@Injectable()
export class NotificationsService {
  notifications$: ReplaySubject<SiteNotification[]>;
  notifs: SiteNotification[]; // TODO removeme

  constructor(private router: Router,
              private http: HttpClient,
              private toasterService: ToasterService) {
    this.notifications$ = new ReplaySubject<SiteNotification[]>(1);
    this.notifs = [ // TODO removeme
      {
        id: 1,
        forUser: {
          id: '1',
          permissions: 0,
        },
        activity: {
          id: 1,
          user: {
            id: '1',
            permissions: 0,
            profile: {
              id: '1',
              alias: 'Ninja',
              bio: '',
              avatarURL: '/assets/images/caution.png',
            },
          },
          type: Activity_Type.USER_JOINED,
          data: 'lol',
          createdAt: new Date(Date.now() - 1000),
        },
        read: false,
        createdAt: new Date(),
      },
      {
        id: 1,
        forUser: {
          id: '1',
          permissions: 0,
        },
        activity: {
          id: 1,
          user: {
            id: '1',
            permissions: 0,
            profile: {
              id: '1',
              alias: 'TESSSSSSSSSSSSSSSSSSST',
              bio: '',
              avatarURL: '/assets/images/caution.png',
            },
          },
          type: Activity_Type.PB_ACHIEVED,
          data: 'lol',
          createdAt: new Date(Date.now() - 2000),
        },
        read: false,
        createdAt: new Date(Date.now() - 1000),
      },
    ];
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
    // this.notifications$.next(this.notifs);
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
