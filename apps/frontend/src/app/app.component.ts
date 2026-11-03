import {
  AfterViewInit,
  Component,
  inject,
  Renderer2,
  signal
} from '@angular/core';
import { ToastModule } from '@openng/optimus-ui/toast';
import { LayoutService } from './services/layout.service';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { HeaderComponent } from './components/layout/header.component';
import { SidenavComponent } from './components/layout/sidenav.component';
import { NgStyle } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'm-app',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.css',
  imports: [
    HeaderComponent,
    SidenavComponent,
    ToastModule,
    ConfirmDialogModule,
    NgStyle,
    RouterOutlet
  ]
})
export class AppComponent implements AfterViewInit {
  protected readonly customBackgroundImage = signal('');
  protected readonly customBackgroundOpacity = signal(0);

  private readonly layoutService = inject(LayoutService);
  private readonly renderer = inject(Renderer2);

  constructor() {
    this.layoutService.backgroundChange.subscribe((url: string | null) => {
      if (url != null) {
        this.customBackgroundImage.set(`url(${url})`);
        if (this.layoutService.backgroundEnable.value) {
          this.customBackgroundOpacity.set(1);
        }
      } else {
        // Don't unset the custom background, so we get a smooth transition
        this.customBackgroundOpacity.set(0);
      }
    });

    this.layoutService.backgroundEnable.subscribe((enable: boolean) => {
      this.customBackgroundOpacity.set(enable ? 1 : 0);
    });
  }

  ngAfterViewInit() {
    this.renderer.setStyle(
      this.renderer.selectRootElement('#loading'),
      'display',
      'none'
    );
  }
}
