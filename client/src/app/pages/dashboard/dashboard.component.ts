import {Component, OnInit} from '@angular/core';
import {NbMenuItem} from '@nebular/theme';
import {MENU_ITEMS} from './dashboard-menu';
import {LocalUserService} from '../../@core/data/local-user.service';
import {ToasterConfig} from 'angular2-toaster';
import {NotificationsService} from '../../@core/utils/notifications.service';

@Component({
  selector: 'dashboard',
  template: `
    <toaster-container [toasterconfig]="toasterConfig"></toaster-container>
    <ngx-sample-layout>
      <nb-menu [items]="menu"></nb-menu>
      <router-outlet></router-outlet>
    </ngx-sample-layout>
  `,
})
export class DashboardComponent implements OnInit {
  menu = MENU_ITEMS;
  // Toaster config things
  readonly timeout: number = 5000; // in milliseconds
  readonly toasterConfig: ToasterConfig = new ToasterConfig({
    positionClass: 'toast-top-full-width',
    timeout: this.timeout,
    newestOnTop: true,
    tapToDismiss: true,
    preventDuplicates: true,
    animation: 'fade',
    limit: 5,
    showCloseButton: true,
  });

  constructor(private userService: LocalUserService,
              private notificationService: NotificationsService) {
    this.notificationService.inject();
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
