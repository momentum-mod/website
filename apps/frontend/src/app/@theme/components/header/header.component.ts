import { Component, OnDestroy, OnInit } from '@angular/core';
import { NbMenuItem, NbMenuService, NbSidebarService } from '@nebular/theme';
import { AnalyticsService } from '../../../@core/utils/analytics.service';
import { NotificationsService } from '../../../@core/utils/notifications.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Notification, User } from '@momentum/types';
import { LocalUserService } from '@momentum/frontend/data';
import { LayoutService } from '../../../services/layout.service';

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject<void>();

  userMenu: NbMenuItem[] = [
    {
      title: 'Profile',
      link: '/dashboard/profile'
    },
    {
      title: 'Edit Profile',
      link: '/dashboard/profile/edit'
    },
    {
      title: 'Log out'
    }
  ];

  user: User;
  notifications: Notification[];
  numUnreadNotifs: number;

  constructor(
    private sidebarService: NbSidebarService,
    private menuService: NbMenuService,
    private userService: LocalUserService,
    private analyticsService: AnalyticsService,
    private layoutService: LayoutService,
    private notificationService: NotificationsService
  ) {
    this.notifications = [];
    this.numUnreadNotifs = 0;
    this.menuService
      .onItemClick()
      .subscribe((event) => this.onContextItemSelection(event.item.title));
  }

  ngOnInit() {
    this.userService
      .getLocal()
      .pipe(takeUntil(this.ngUnsub))
      .subscribe((usr) => {
        this.user = usr;
      });
    this.notificationService.notifications.subscribe((notifs) => {
      this.notifications = notifs;
      this.numUnreadNotifs = this.notifications.filter(
        (notif) => notif.read === false
      ).length;
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
    return this.notifications.length === 0 ? 'bell-outline' : 'bell';
  }
}
