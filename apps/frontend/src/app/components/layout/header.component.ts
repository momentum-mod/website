import { Component, OnInit, inject } from '@angular/core';
import { Notification } from '@momentum/constants';
import { MenuItem } from 'primeng/api';
import { LayoutService } from '../../services/layout.service';
import { NotificationComponent } from '../notification/notification.component';
import { MultiSearchComponent } from '../search/multi-search.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { NotificationsService } from '../../services/notifications.service';

import { LocalUserService } from '../../services/data/local-user.service';
import { MenuModule } from 'primeng/menu';
import { IconComponent } from '../../icons';
import { AsyncPipe } from '@angular/common';
import { Popover } from 'primeng/popover';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [
    MultiSearchComponent,
    NotificationComponent,
    PlayerCardComponent,
    MenuModule,
    IconComponent,
    AsyncPipe,
    Popover,
    RouterLink
  ]
})
export class HeaderComponent implements OnInit {
  protected readonly localUserService = inject(LocalUserService);
  private readonly layoutService = inject(LayoutService);
  private readonly notificationService = inject(NotificationsService);

  protected menu: MenuItem[] = [];
  protected notifications: Notification[] = [];
  protected unreadNotificationCount = 0;

  ngOnInit() {
    this.notificationService.notifications.subscribe((notifs) => {
      this.notifications = notifs;
      this.unreadNotificationCount = this.notifications.filter(
        ({ read }) => read === false
      ).length;
    });

    this.localUserService.user.subscribe(() => {
      const userID = this.localUserService.user.value?.id;
      this.menu = [
        {
          label: 'Profile',
          // If `user` hasn't been fetched yet, just navigate to ProfileRedirect
          // component, which will await the user result then redirect to relatived URL.
          routerLink: userID ? `/profile/${userID}` : '/profile'
        },
        {
          label: 'Edit Profile',
          routerLink: '/profile/edit'
        },
        {
          label: 'Log out',
          command: () => this.localUserService.logout()
        }
      ];
    });
  }

  protected toggleSidenav() {
    this.layoutService.toggleSidenavState();
  }
}
