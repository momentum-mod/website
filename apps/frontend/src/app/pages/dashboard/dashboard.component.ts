import { Component, OnInit } from '@angular/core';
import { NbMenuItem } from '@nebular/theme';
import { MENU_ITEMS } from './dashboard-menu';
import { LocalUserService } from '../../@core/data/local-user.service';
import { NotificationsService } from '../../@core/utils/notifications.service';

@Component({
  selector: 'mom-dashboard',
  template: `
    <ngx-admin-dashboard>
      <nb-menu [autoCollapse]="true" [items]="menu"></nb-menu>
      <router-outlet></router-outlet>
    </ngx-admin-dashboard>
  `
})
export class DashboardComponent implements OnInit {
  menu = MENU_ITEMS;

  constructor(
    private userService: LocalUserService,
    private notificationService: NotificationsService
  ) {
    this.notificationService.inject();
  }

  ngOnInit() {
    for (const item of this.menu) {
      this.authMenuItem(item);
    }
  }

  authMenuItem(menuItem: NbMenuItem) {
    if (menuItem.data && menuItem.data.roles) {
      let hideMenuItem = true;
      for (const role of menuItem.data.roles) {
        if (this.userService.hasRole(role)) {
          hideMenuItem = false;
        }
      }
      menuItem.hidden = hideMenuItem;
    }
    if (menuItem.children) {
      for (const item of menuItem.children) {
        this.authMenuItem(item);
      }
    }
  }
}
