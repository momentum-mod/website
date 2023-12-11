import { Component, OnDestroy, OnInit } from '@angular/core';
import { NotificationsService } from '../../services/notifications.service';
import { takeUntil } from 'rxjs/operators';
import { Notification, User } from '@momentum/constants';
import { LocalUserService } from '@momentum/frontend/data';
import { LayoutService } from '../../services/layout.service';
import { NotificationComponent } from '../notification/notification.component';
import { SearchComponent } from '../search/search.component';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@momentum/frontend/icons';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CommonModule } from '@angular/common';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { Subject } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'm-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    SearchComponent,
    NotificationComponent,
    OverlayPanelModule,
    CommonModule,
    PlayerCardComponent,
    MenuModule
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  menu: MenuItem[] = [
    {
      label: 'Profile',
      // If `user` hasn't been fetched yet, just navigate to ProfileRedirect
      // component, which will await the user result then redirect to relatived URL.
      routerLink: this.user?.id ? `/profile/${this.user.id}` : '/profile'
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

  protected user?: User;
  protected notifications: Notification[] = [];
  protected unreadNotificationCount = 0;

  private readonly ngUnsub = new Subject<void>();

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly layoutService: LayoutService,
    private readonly notificationService: NotificationsService
  ) {}

  ngOnInit() {
    this.localUserService.localUserSubject
      .pipe(takeUntil(this.ngUnsub))
      .subscribe((user) => (this.user = user));
    this.notificationService.notifications.subscribe((notifs) => {
      this.notifications = notifs;
      this.unreadNotificationCount = this.notifications.filter(
        ({ read }) => read === false
      ).length;
    });
  }

  ngOnDestroy() {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }

  toggleSidenav() {
    this.layoutService.toggleSidenavState();
  }
}
