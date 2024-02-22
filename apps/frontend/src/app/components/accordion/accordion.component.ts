import {
  AfterContentInit,
  Component,
  ContentChildren,
  Input,
  QueryList
} from '@angular/core';
import { AccordionItemComponent } from './accordion-item.component';
import { Subject, takeWhile } from 'rxjs';

/**
 * Slip like Freudian your first and last step to playing yourself like
 */
@Component({
  selector: 'm-accordion',
  template: '<ng-content/>',
  standalone: true
})
export class AccordionComponent implements AfterContentInit {
  // Strategy: each accordion-item component is passed the same subject, which
  // it calls with a key unique to that component instance whenever it opens.
  // Then just iterate over the query list of accordion items, opening the
  // one that makes the key, and closing the rest.
  private readonly itemOpened = new Subject<symbol>();

  @Input() startFirstOpen?: boolean;

  @ContentChildren(AccordionItemComponent)
  private items: QueryList<AccordionItemComponent>;

  ngAfterContentInit() {
    this.items.changes.subscribe(() => this.passChildSubjects());
    this.itemOpened.subscribe((key) => this.onItemOpened(key));
    if (this.startFirstOpen)
      this.items.changes
        .pipe(
          takeWhile(() => {
            const item = this.items.get(0);
            if (item) {
              item.open = true;
              return true;
            }
            return false;
          })
        )
        .subscribe();
  }

  passChildSubjects() {
    this.items.forEach((item) => (item.opened = this.itemOpened));
  }

  onItemOpened(key: symbol) {
    for (const item of this.items) {
      item.open = item.Key === key;
    }
  }
}
