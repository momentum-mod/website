import { Component, Input } from '@angular/core';
import { CardHeaderComponent } from './card-header.component';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'm-card',
  standalone: true,
  imports: [CardHeaderComponent, NgIf, NgClass],
  template: `
    <m-card-header [title]="title" [titleSize]="titleSize">
      <ng-content select="[header]"></ng-content>
    </m-card-header>
    <div class="m-card" [ngClass]="cardClass">
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() title: string;
  @Input() titleSize: string | number = 4;
  @Input() cardClass = '';
}
