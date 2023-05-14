import { Component, OnInit } from '@angular/core';
import { NbMenuItem } from '@nebular/theme';
import { MENU_ITEMS } from './dashboard-menu';
import { NotificationsService } from '../../services/notifications.service';
import { LocalUserService } from '@momentum/frontend/data';

@Component({
  selector: 'mom-dashboard',
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss']
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
