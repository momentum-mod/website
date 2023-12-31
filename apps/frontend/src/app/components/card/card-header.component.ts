import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-card-header',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="flex items-end gap-2 mb-2" [ngClass]="{ 'items-end': !!title }">
      @if (title) {
        <p
          class="flex-grow font-display font-bold opacity-80 leading-none ml-2"
          [style]="'font-size: ' + titleSize + 'rem;'"
        >
          {{ title }}
        </p>
      }
      <ng-content></ng-content>
    </div>
  `
})
export class CardHeaderComponent {
  @Input() title: string;
  @Input({ required: true }) titleSize!: string | number;
}
