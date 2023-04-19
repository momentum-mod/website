import { Component, OnInit } from '@angular/core';
import { NbMenuItem } from '@nebular/theme';
import { MENU_ITEMS } from './dashboard-menu';
import { LocalUserService } from '../../@core/data/local-user.service';
import { NotificationsService } from '../../@core/utils/notifications.service';

@Component({
  selector: 'dashboard',
  template: `
    <ngx-sample-layout>
      <nb-menu [autoCollapse]="true" [items]="menu"></nb-menu>
      <router-outlet></router-outlet>
    </ngx-sample-layout>
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
    this.menu.forEach((item) => {
      this.authMenuItem(item);
    });
  }

  authMenuItem(menuItem: NbMenuItem) {
    if (menuItem.data && menuItem.data.roles) {
      let hideMenuItem = true;
      menuItem.data.roles.forEach((role) => {
        if (this.userService.hasRole(role)) {
          hideMenuItem = false;
        }
      });
      menuItem.hidden = hideMenuItem;
    }
    if (menuItem.children) {
      menuItem.children.forEach((item) => {
        this.authMenuItem(item);
      });
    }
  }
}
