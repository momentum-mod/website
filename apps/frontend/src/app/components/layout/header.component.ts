import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MenuItem } from '@openng/optimus-ui/api';
import { LayoutService } from '../../services/layout.service';
import { MultiSearchComponent } from '../search/multi-search.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { LocalUserService } from '../../services/data/local-user.service';
import { MenuModule } from '@openng/optimus-ui/menu';
import { IconComponent } from '../../icons';
import { RouterLink } from '@angular/router';
import { NotificationsMenuComponent } from '../notifications/notifications-menu.component';
import { PopoverComponent } from '../popover/popover.component';

@Component({
  selector: 'm-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [
    MultiSearchComponent,
    PlayerCardComponent,
    MenuModule,
    IconComponent,
    RouterLink,
    NotificationsMenuComponent,
    PopoverComponent
  ]
})
export class HeaderComponent {
  protected readonly localUserService = inject(LocalUserService);
  private readonly layoutService = inject(LayoutService);

  protected readonly user = toSignal(this.localUserService.user);

  protected readonly unreadNotificationsCount = signal(0);

  protected readonly profileDropdownMenu = computed<MenuItem[]>(() => {
    const userID = this.user()?.id;
    return [
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

  protected readonly markingAsReadEnabled = signal(false);

  protected toggleSidenav() {
    this.layoutService.toggleSidenavState();
  }

  protected updateUnreadNotificationsCount(count: number) {
    this.unreadNotificationsCount.set(count);
  }
}
