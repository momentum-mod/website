import { Component, HostBinding, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { CardHeaderComponent } from './card-header.component';
import { CardBodyComponent } from './card-body.component';

@Component({
  selector: 'm-card',
  standalone: true,
  imports: [CardHeaderComponent, NgClass, CardBodyComponent],
  template: `
    <m-card-header class="card-header" [title]="title" [titleSize]="titleSize">
      <ng-content select="[header]"></ng-content>
    </m-card-header>
    <m-card-body [ngClass]="cardClass">
      <ng-content></ng-content>
    </m-card-body>
  `
})
export class CardComponent {
  @HostBinding('class') classes = 'card';
  @Input() title: string;
  @Input() titleSize: string | number = 2;
  @Input() cardClass = '';
}
