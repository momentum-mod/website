import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { CardHeaderComponent } from './card-header.component';
import { CardBodyComponent } from './card-body.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'm-card',
  host: { class: 'card' },
  imports: [CardHeaderComponent, NgClass, CardBodyComponent, SpinnerComponent],
  template: `
    <m-card-header
      class="card-header"
      [title]="title()"
      [titleSize]="titleSize()"
    >
      <ng-content select="[header]"></ng-content>
    </m-card-header>
    <m-card-body [ngClass]="cardClass()">
      @if (loading() == null || loading() === false) {
        <ng-content></ng-content>
      } @else {
        <m-spinner />
      }
    </m-card-body>
  `
})
export class CardComponent {
  readonly title = input<string>();
  readonly titleSize = input<string | number>(2);
  readonly cardClass = input('');

  /**
   * Shows a loading spinner INSTEAD of content when true.
   */
  readonly loading = input<boolean>();
}
