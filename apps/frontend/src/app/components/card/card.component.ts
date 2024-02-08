import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { CardHeaderComponent } from './card-header.component';
import { CardBodyComponent } from './card-body.component';

@Component({
  selector: 'm-card',
  standalone: true,
  imports: [CardHeaderComponent, NgClass, CardBodyComponent],
  template: `
    <m-card-header [title]="title" [titleSize]="titleSize">
      <ng-content select="[header]"></ng-content>
    </m-card-header>
    <m-card-body [ngClass]="cardClass">
      <ng-content></ng-content>
    </m-card-body>
  `
})
export class CardComponent {
  @Input() title: string;
  @Input() titleSize: string | number = 4;
  @Input() cardClass = '';
}
