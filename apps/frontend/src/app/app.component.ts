import { Component } from '@angular/core';
import {
  NbMenuItem,
  NbLayoutModule,
  NbSidebarModule,
  NbMenuModule
} from '@nebular/theme';
import { LocalUserService } from '@momentum/frontend/data';
import { NotificationsService } from './services/notifications.service';
import { Role } from '@momentum/constants';
import { MENU_ITEMS } from './app-menu';
import {
  MaterialDesignIcons,
  MomentumIcons,
  SimpleIcons,
  IconComponent
} from '@momentum/frontend/icons';
import { kebabCase } from '@momentum/util-fn';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'mom-app',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    NbLayoutModule,
    HeaderComponent,
    NbSidebarModule,
    NbMenuModule,
    IconComponent,
    RouterOutlet
  ]
})
export class AppComponent {
  constructor(
    private userService: LocalUserService,
    private notificationService: NotificationsService
  ) {
    this.notificationService.inject();
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
