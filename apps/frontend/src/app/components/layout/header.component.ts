import { Component, OnInit } from '@angular/core';
import { Notification } from '@momentum/constants';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MenuItem } from 'primeng/api';
import { LayoutService } from '../../services/layout.service';
import { MultiSearchComponent } from '../search/multi-search.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
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
    OverlayPanelModule,
    PlayerCardComponent,
    MenuModule
  ]
})
export class HeaderComponent implements OnInit {
  protected menu: MenuItem[] = [];
  protected notifications: Notification[] = [];
  protected unreadNotificationCount = 0;

  constructor(
    protected readonly localUserService: LocalUserService,
    private readonly layoutService: LayoutService
  ) {}

  ngOnInit() {
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
