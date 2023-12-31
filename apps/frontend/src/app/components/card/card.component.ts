import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { CardHeaderComponent } from './card-header.component';

@Component({
  selector: 'm-card',
  standalone: true,
  imports: [CardHeaderComponent, NgClass],
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
