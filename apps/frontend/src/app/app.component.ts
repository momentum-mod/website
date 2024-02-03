import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NotificationsService } from './services/notifications.service';
import { IconComponent } from './icons';
import { HeaderComponent, SidenavComponent } from './components';
import { LayoutService, SidenavState } from './services/layout.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

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
    ToastModule,
    ConfirmDialogModule
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
