import {Component, OnDestroy, OnInit} from '@angular/core';
import {NbMenuItem, NbMenuService, NbSidebarService} from '@nebular/theme';
import {LocalUserStoreService} from '../../../@core/data/local-user/local-user-store.service';
import {AnalyticsService} from '../../../@core/utils/analytics.service';
import {LayoutService} from '../../../@core/data/layout.service';
import {User} from '../../../@core/models/user.model';
import {NotificationsService} from '../../../@core/utils/notifications.service';
import {SiteNotification} from '../../../@core/models/notification.model';
import { takeUntil, map } from 'rxjs/operators';
import {Subject} from 'rxjs';

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {

  private ngUnsub = new Subject();

  userMenu: NbMenuItem[] = [
    {
      title: 'Profile',
      link: '/dashboard/profile',
    },
    {
      title: 'Edit Profile',
      link: '/dashboard/profile/edit',
    },
    {
      title: 'Log out',
    },
  ];

  user: User;
  notifications: SiteNotification[];
  numUnreadNotifs: number;

  constructor(private sidebarService: NbSidebarService,
              private menuService: NbMenuService,
              private userService: LocalUserStoreService,
              private analyticsService: AnalyticsService,
              private layoutService: LayoutService,
              private notificationService: NotificationsService) {
    this.notifications = [];
    this.numUnreadNotifs = 0;
    this.menuService.onItemClick().subscribe((event) => {
      this.onContextItemSelection(event.item.title);
    });
  }

  ngOnInit() {
    this.userService.localUser$.pipe(
      takeUntil(this.ngUnsub),
      map(c => {
        if(c)
        {
          this.user = c;
        }
      }),
    ).subscribe();
    this.notificationService.notifications.subscribe(notifs => {
      this.notifications = notifs;
      this.numUnreadNotifs = this.notifications.filter(notif => notif.read === false).length;
    });
  }

  ngOnDestroy(): void {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }

  onContextItemSelection(title) {
    if (title === 'Log out') {
      this.userService.logout();
    }
  }

  toggleSidebar(): boolean {
    this.sidebarService.toggle(true, 'menu-sidebar');
    this.layoutService.changeLayoutSize();

    return false;
  }

  navigateHome() {
    this.menuService.navigateHome();
    return false;
  }

  startSearch() {
    this.analyticsService.trackEvent('startSearch');
  }

  getNotificationIconClass() {
    if (this.notifications.length === 0)
      return 'bell-outline';
    else {
      return 'bell';
    }
  }
}
