import { Component, OnInit } from '@angular/core';
import { NbMenuItem } from '@nebular/theme';
import { MENU_ITEMS } from './dashboard-menu';
import { LocalUserService } from '../../@core/data/local-user.service';

@Component({
  selector: 'dashboard',
  template: `
    <ngx-sample-layout>
      <nb-menu [items]="menu"></nb-menu>
      <router-outlet></router-outlet>
    </ngx-sample-layout>
  `,
})
export class DashboardComponent implements OnInit {
  menu = MENU_ITEMS;

  constructor(private userService: LocalUserService) {
  }

  ngOnInit() {
    this.menu.forEach(item => {
      this.authMenuItem(item);
    });
  }

  authMenuItem(menuItem: NbMenuItem) {
    if (menuItem.data && menuItem.data.permissions) {
      let hideMenuItem = true;
      menuItem.data.permissions.forEach(permission => {
        if (this.userService.hasPermission(permission)) {
          hideMenuItem = false;
        }
      });
      menuItem.hidden = hideMenuItem;
    }
  }
}
