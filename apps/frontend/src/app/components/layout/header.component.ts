import { Component, DestroyRef, OnInit } from '@angular/core';
import { Notification, User } from '@momentum/constants';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MenuItem } from 'primeng/api';
import { LayoutService } from '../../services/layout.service';
import { NotificationComponent } from '../notification/notification.component';
import { MultiSearchComponent } from '../search/multi-search.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { NotificationsService } from '../../services/notifications.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../shared.module';
import { LocalUserService } from '../../services/data/local-user.service';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'm-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  standalone: true,
  imports: [
    SharedModule,
    MultiSearchComponent,
    NotificationComponent,
    OverlayPanelModule,
    PlayerCardComponent,
    MenuModule
  ]
})
export class HeaderComponent implements OnInit {
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

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly layoutService: LayoutService,
    private readonly notificationService: NotificationsService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit() {
    this.localUserService.localUserSubject
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => (this.user = user));
    this.notificationService.notifications.subscribe((notifs) => {
      this.notifications = notifs;
      this.unreadNotificationCount = this.notifications.filter(
        ({ read }) => read === false
      ).length;
    });
  }

  toggleSidenav() {
    this.layoutService.toggleSidenavState();
  }
}