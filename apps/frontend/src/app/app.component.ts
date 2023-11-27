import { Component } from '@angular/core';
import { NotificationsService } from './services/notifications.service';
import { IconComponent } from '@momentum/frontend/icons';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';
import { SidenavComponent } from './components/sidenav/sidenav.component';

@Component({
  selector: 'mom-app',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    HeaderComponent,
    IconComponent,
    RouterOutlet,
    SidenavComponent
  ]
})
export class AppComponent {
  constructor(private readonly notificationService: NotificationsService) {
    this.notificationService.inject();
  }
}
