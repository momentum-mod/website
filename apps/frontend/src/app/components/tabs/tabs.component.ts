import {
  AfterContentInit,
  Component,
  ContentChildren,
  Input,
  QueryList
} from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { TabDirective } from './tab.component';

@Component({
  selector: 'm-tabs',
  standalone: true,
  imports: [NgClass, NgStyle],
  styles: ':host { display: block; }',
  // TODO: Carousel support. Often the top menu can exceed the width of the
  // parent, carousel could look good - though I'd rather not bunge a PrimeNG one
  // in here... Maybe okay?
  template: `<div class="w-full flex gap-2 items-center scroll-auto">
      @for (tab of tabs; track $index) {
        <button
          type="button"
          class="p-2 font-display text-gray-300 drop-shadow font-bold
                 leading-none transition-colors hover:text-gray-200"
          (click)="selectTab($index)"
          [ngClass]="{ '!text-gray-50': activeIndex === $index }"
          [ngStyle]="{ 'font-size': headerFontSize }"
        >
          {{ tab.tabName }}
        </button>
      }
    </div>
    <div class="stack">
      <ng-content></ng-content>
    </div> `
})
export class TabsComponent implements AfterContentInit {
  @Input() headerFontSize = '2rem';
  @ContentChildren(TabDirective) tabs: QueryList<TabDirective>;

  protected activeIndex: number;

  ngAfterContentInit(): void {
    this.selectTab(0);
  }

  selectTab(index: number): void {
    this.activeIndex = index;
    this.tabs.forEach((tab, i) => (tab.selected = i === index));
  }
}
