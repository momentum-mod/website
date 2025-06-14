import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Input,
  QueryList,
  inject
} from '@angular/core';
import { AccordionItemComponent } from './accordion-item.component';
import { Subject, delay, takeWhile } from 'rxjs';

/**
 * Slip like Freudian your first and last step to playing yourself like
 */
@Component({
  selector: 'm-accordion',
  template: '<ng-content/>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccordionComponent implements AfterContentInit {
  private readonly cdRef = inject(ChangeDetectorRef);

  // Strategy: each accordion-item component injects this component, which calls
  // the below Subject  whenever it opens with a key unique to that component.
  // Then we just iterate over the query list of accordion items, opening the
  // one that makes the key, and closing the rest. This is easier than handling
  // separate Subjects for each item. Accordion to who? Me.
  public readonly itemOpened = new Subject<symbol>();

  /** Close all other items when one item is opened */
  @Input() autoClose = true;

  /** Start with the first item opened */
  @Input() startFirstOpen = false;

  /** Start with all items opened */
  @Input() startAllOpen = false;

  @ContentChildren(AccordionItemComponent)
  private items: QueryList<AccordionItemComponent>;

  ngAfterContentInit() {
    this.itemOpened.subscribe((key) => this.onItemOpened(key));
    if (this.startFirstOpen || this.startAllOpen)
      this.items.changes
        .pipe(
          // Delay this check until next EL macrotask to avoid
          // ExpressionChangedAfterItHasBeenCheckedError that throw even with
          // the explicit CDRef.detachChanges call for some fucking reason.
          // See https://stackoverflow.com/a/72021564
          delay(0),
          takeWhile(() => {
            const item = this.items.get(0);
            if (!item) return false;

            if (this.startFirstOpen) {
              item.open = true;
            } else if (this.startAllOpen) {
              this.items.forEach((item) => (item.open = true));
            }

            this.cdRef.detectChanges();
            return true;
          })
        )
        .subscribe();
  }

  onItemOpened(key: symbol) {
    for (const item of this.items) {
      // CD calls happen in here
      if (item.Key === key) {
        item.open = true;
      } else if (this.autoClose) {
        item.open = false;
      }
    }
  }
}
