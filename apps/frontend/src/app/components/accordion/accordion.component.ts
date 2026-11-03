import {
  Component,
  contentChildren,
  DestroyRef,
  effect,
  inject,
  input,
  untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccordionItemComponent } from './accordion-item.component';
import { Subject } from 'rxjs';

/**
 * Slip like Freudian your first and last step to playing yourself like
 */
@Component({
  selector: 'm-accordion',
  template: '<ng-content/>'
})
export class AccordionComponent {
  // Strategy: each accordion-item component injects this component, which calls
  // the below Subject  whenever it opens with a key unique to that component.
  // Then we just iterate over the query list of accordion items, opening the
  // one that makes the key, and closing the rest. This is easier than handling
  // separate Subjects for each item. Accordion to who? Me.
  public readonly itemOpened = new Subject<symbol>();

  /** Close all other items when one item is opened */
  readonly autoClose = input(true);

  /** Start with the first item opened */
  readonly startFirstOpen = input(false);

  /** Start with all items opened */
  readonly startAllOpen = input(false);

  private readonly items = contentChildren(AccordionItemComponent);

  constructor() {
    this.itemOpened
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((key) => this.onItemOpened(key));

    // (Re)open items whenever the projected items change.
    effect(() => {
      const items = this.items();
      if (items.length === 0) return;
      untracked(() => {
        if (this.startFirstOpen()) {
          items[0].open = true;
        } else if (this.startAllOpen()) {
          items.forEach((item) => (item.open = true));
        }
      });
    });
  }

  onItemOpened(key: symbol) {
    for (const item of this.items()) {
      if (item.Key === key) {
        item.open = true;
      } else if (this.autoClose()) {
        item.open = false;
      }
    }
  }
}
