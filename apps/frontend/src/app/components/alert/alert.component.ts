import { Component, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../icons';

@Component({
  selector: 'm-alert',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: ` <div class="prose max-w-none">
      <ng-content />
    </div>
    <button
      type="button"
      class="absolute right-0 top-0 m-4 opacity-75 transition-opacity hover:opacity-100"
      (click)="dismiss()"
    >
      <m-icon icon="close-thick" />
    </button>`
})
export class AlertComponent {
  @HostBinding('style.display')
  protected display = 'block';

  @HostBinding('class')
  private readonly class = 'alert';

  dismiss() {
    this.display = 'none';
  }
}
