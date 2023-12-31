import { Component } from '@angular/core';
import { NotificationsService } from './services/notifications.service';
import { IconComponent } from './icons';
import { HeaderComponent } from './components';
import { RouterOutlet } from '@angular/router';
import { SidenavComponent } from './components';
import { ToastModule } from 'primeng/toast';
import { LayoutService, SidenavState } from './services/layout.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'm-app',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.css',
  standalone: true,
  imports: [
    HeaderComponent,
    IconComponent,
    RouterOutlet,
    SidenavComponent,
    ToastModule
  ]
})
export class AppComponent {
  protected state: SidenavState;

  private readonly ngUnsub = new Subject<void>();

  constructor(
    private readonly notificationService: NotificationsService,
    private readonly layoutService: LayoutService
  ) {
    this.notificationService.inject();

    this.layoutService.sidenavToggled
      .pipe(takeUntil(this.ngUnsub))
      .subscribe((state) => (this.state = state));
  }
}
