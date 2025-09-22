import { Component, OnInit, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LayoutService } from '../../services/layout.service';
import { MultiSearchComponent } from '../search/multi-search.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { LocalUserService } from '../../services/data/local-user.service';
import { MenuModule } from 'primeng/menu';
import { IconComponent } from '../../icons';
import { AsyncPipe } from '@angular/common';
import { Popover } from 'primeng/popover';
import { RouterLink } from '@angular/router';
import { NotificationsMenuComponent } from '../notifications/notifications-menu.component';

@Component({
  selector: 'm-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [
    MultiSearchComponent,
    PlayerCardComponent,
    MenuModule,
    IconComponent,
    AsyncPipe,
    Popover,
    RouterLink,
    NotificationsMenuComponent
  ]
})
export class HeaderComponent implements OnInit {
  protected readonly localUserService = inject(LocalUserService);
  private readonly layoutService = inject(LayoutService);

  protected unreadNotificationsCount = 0;

  protected profileDropdownMenu: MenuItem[] = [];

  protected markingAsReadEnabled = false;

  ngOnInit() {
    this.localUserService.user.subscribe(() => {
      const userID = this.localUserService.user.value?.id;
      this.profileDropdownMenu = [
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

  protected updateUnreadNotificationsCount(count: number) {
    this.unreadNotificationsCount = count;
  }
}
