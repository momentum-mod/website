import { Component, Input } from '@angular/core';

@Component({
  selector: 'mom-page-header',
  standalone: true,
  template: `
    <div class="flex items-end gap-4">
      <p
        class="flex-grow font-display font-bold opacity-80"
        [style]="'font-size: ' + titleSize + ';'"
      >
        {{ title }}
      </p>
      <ng-content></ng-content>
    </div>
  `
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() titleSize = '4rem';
}
