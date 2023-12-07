import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  NbMenuItem,
  NbMenuService,
  NbActionsModule,
  NbPopoverModule,
  NbUserModule,
  NbContextMenuModule
} from '@nebular/theme';
import { NotificationsService } from '../../services/notifications.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Notification, User } from '@momentum/constants';
import { LocalUserService } from '@momentum/frontend/data';
import { LayoutService } from '../../services/layout.service';
import { NotificationComponent } from '../notification/notification.component';
import { SearchComponent } from '../search/search.component';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@momentum/frontend/icons';
import { TooltipModule } from 'primeng/tooltip';
import { OverlayPanelModule } from 'primeng/overlaypanel';

@Component({
  selector: 'mom-header',
  templateUrl: './header.component.html',
  standalone: true,
  imports: [
    IconComponent,
    RouterLink,
    NbActionsModule,
    SearchComponent,
    NbPopoverModule,
    NotificationComponent,
    NbUserModule,
    NbContextMenuModule,
    TooltipModule,
    OverlayPanelModule
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject<void>();

  userMenu: NbMenuItem[] = [
    {
      title: 'Profile',
      // If `user` hasn't been fetched yet, just navigate to ProfileRedirect
      // component, which will await the user result then redirect to relatived URL.
      link: this.user?.id ? `/profile/${this.user.id}` : '/profile'
    },
    {
      title: 'Edit Profile',
      link: '/profile/edit'
    },
    {
      title: 'Log out'
    }
  ];

  user?: User;
  notifications: Notification[];
  numUnreadNotifs: number;

  constructor(
    private readonly menuService: NbMenuService,
    private readonly userService: LocalUserService,
    private readonly layoutService: LayoutService,
    private readonly notificationService: NotificationsService
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
      .subscribe((user) => (this.user = user));
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

  logout() {
    this.userService.logout();
  }

  toggleSidenav() {
    this.layoutService.toggleSidenavState();
  }

  navigateHome() {
    this.menuService.navigateHome();
    return false;
  }

  getNotificationIconClass() {
    return this.notifications.length === 0 ? 'bell-outline' : 'bell';
  }
}
