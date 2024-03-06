import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-card-header',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="flex items-center gap-2" [ngClass]="{ 'items-end': !!title }">
      @if (title) {
        <p
          class="flex-grow card-title"
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
