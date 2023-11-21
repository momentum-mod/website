import { Component } from '@angular/core';
import { NbIconLibraries, NbMenuItem } from '@nebular/theme';
import { initIconPacks } from '@momentum/frontend/icons';
import { LocalUserService } from '@momentum/frontend/data';
import { NotificationsService } from './services/notifications.service';
import { Role } from '@momentum/constants';
import { MENU_ITEMS } from './app-menu';

@Component({
  selector: 'mom-app',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  constructor(
    private userService: LocalUserService,
    private notificationService: NotificationsService,
    private iconLibraries: NbIconLibraries
  ) {
    this.notificationService.inject();
    initIconPacks(this.iconLibraries);
  }

  menu = MENU_ITEMS;

  ngOnInit() {
    for (const item of this.menu) {
      this.authMenuItem(item);
    }
  }

  authMenuItem(menuItem: NbMenuItem) {
    const allowedRoles = menuItem?.data?.roles as Role[];
    menuItem.hidden =
      allowedRoles &&
      !allowedRoles.some((role) => this.userService.hasRole(role));

    if (menuItem.children) {
      for (const item of menuItem.children) {
        this.authMenuItem(item);
      }
    }
  }
}
