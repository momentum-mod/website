import { Component, signal } from '@angular/core';
import { IconComponent } from '../../icons';

@Component({
  selector: 'm-alert',
  host: {
    class: 'alert',
    '[style.display]': 'display()'
  },
  imports: [IconComponent],
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
  protected readonly display = signal('block');

  dismiss() {
    this.display.set('none');
  }
}
