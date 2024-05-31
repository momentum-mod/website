import { Component } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { LayoutService, SidenavState } from './services/layout.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { HeaderComponent } from './components/layout/header.component';
import { SidenavComponent } from './components/layout/sidenav.component';
import { SharedModule } from './shared.module';

@Component({
  selector: 'm-app',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.css',
  standalone: true,
  imports: [
    SharedModule,
    HeaderComponent,
    SidenavComponent,
    ToastModule,
    ConfirmDialogModule
  ]
})
export class AppComponent {
  protected sideNavState: SidenavState;
  protected customBackgroundImage = '';
  protected customBackgroundOpacity = 0;

  constructor(private readonly layoutService: LayoutService) {
    this.layoutService.sidenavToggled.subscribe(
      (state) => (this.sideNavState = state)
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
