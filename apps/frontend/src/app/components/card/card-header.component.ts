import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-card-header',
  imports: [NgClass],
  template: `
    <div
      class="flex flex-wrap items-center gap-2"
      [ngClass]="{ 'items-end': !!title }"
    >
      @if (title) {
        <p class="flex-grow card-title" [style.font-size]="fontSize">
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

  /**
   * Big titles shrink on mobile via --card-title-scale (see styles.css), but
   * never below the default 2rem, so ordinary card titles are unaffected.
   */
  protected get fontSize(): string {
    const size = Number(this.titleSize);
    return size > 2
      ? `max(2rem, calc(${size}rem * var(--card-title-scale, 1)))`
      : `${size}rem`;
  }
}
