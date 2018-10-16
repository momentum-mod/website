import { Component, Input } from '@angular/core';

import {NbMenuItem, NbMenuService, NbSidebarService} from '@nebular/theme';
import { LocalUserService } from '../../../@core/data/local-user.service';
import { AnalyticsService } from '../../../@core/utils/analytics.service';
import { LayoutService } from '../../../@core/data/layout.service';

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
})
export class HeaderComponent {

  @Input() position = 'normal';
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

  constructor(private sidebarService: NbSidebarService,
              private menuService: NbMenuService,
              public userService: LocalUserService,
              private analyticsService: AnalyticsService,
              private layoutService: LayoutService) {
  this.menuService.onItemClick()
    .subscribe((event) => {
      this.onContextItemSelection(event.item.title);
    });
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

  goToHome() {
    this.menuService.navigateHome();
  }

  startSearch() {
    this.analyticsService.trackEvent('startSearch');
  }
}
