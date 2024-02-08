import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { NotificationsService } from './services/notifications.service';
import { IconComponent } from './icons';
import { HeaderComponent, SidenavComponent } from './components';
import { LayoutService, SidenavState } from './services/layout.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { NgStyle } from '@angular/common';

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
    ConfirmDialogModule,
    NgStyle
  ]
})
export class AppComponent {
  protected sideNavState: SidenavState;
  protected customBackgroundImage = '';
  protected customBackgroundOpacity = 0;

  constructor(
    private readonly notificationService: NotificationsService,
    private readonly layoutService: LayoutService
  ) {
    this.notificationService.inject();

    this.layoutService.sidenavToggled.subscribe(
      (state) => (this.state = state)
    );

    this.layoutService.backgroundChange.subscribe((url: string | null) => {
      if (url != null) {
        this.customBackgroundImage = `url(${url})`;
        if (this.layoutService.backgroundEnable.value) {
          this.customBackgroundOpacity = 1;
        }
      } else {
        // Don't unset the custom background, so we get a smooth transition
        this.customBackgroundOpacity = 0;
      }
    });

    this.layoutService.backgroundEnable.subscribe((enable: boolean) => {
      this.customBackgroundOpacity = enable ? 1 : 0;
    });
  }
}
