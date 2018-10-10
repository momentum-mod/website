import { Component, Input, OnInit } from '@angular/core';

import {NbMenuItem, NbMenuService, NbSidebarService} from '@nebular/theme';
import { UserService } from '../../../@core/data/user.service';
import { AnalyticsService } from '../../../@core/utils/analytics.service';
import { LayoutService } from '../../../@core/data/layout.service';

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {

  @Input() position = 'normal';
  user: any;
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
  tag = 'my-context-menu';

  constructor(private sidebarService: NbSidebarService,
              private menuService: NbMenuService,
              private userService: UserService,
              private analyticsService: AnalyticsService,
              private layoutService: LayoutService) {
  this.menuService.onItemClick()
    .subscribe((event) => {
      this.onContecxtItemSelection(event.item.title);
    });
  }

  onContecxtItemSelection(title) {
    if (title === 'Log out') {
      this.userService.logout();
    }
  }

  ngOnInit() {
    this.user = this.userService.getInfo();
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
