import { Component, inject, input, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AccordionComponent } from './accordion.component';
import { IconComponent } from '../../icons';

/**
 * Super simple accordion component.
 *
 * Could add support for a header template (instead of just string) if needed.
 * Also, I still haven't bothered to learn Angular animations, which I think can
 * handle animating the height nicely - worth doing in future if we use this
 * more.
 */
@Component({
  selector: 'm-accordion-item',
  imports: [IconComponent],
  host: {
    '[class.hasContent]': 'hasContent()',
    '[class.open]': 'isOpen()'
  },
  template: `
    <button type="button" (click)="toggle()" class="header">
      @if (title(); as title) {
        <p [class]="'text-lg' + titleClass()">
          {{ title }}
        </p>
      } @else {
        <ng-content select="[header]"></ng-content>
      }
      @if (hasContent()) {
        <m-icon
          class="ml-auto"
          [icon]="isOpen() ? 'chevron-up' : 'chevron-down'"
        />
      }
    </button>
    <div class="content">
      <ng-content />
    </div>
  `,
  styles: [
    `
      @reference '../../theme/styles.css';

      :host {
        display: flex;
        flex-direction: column;
        border-top: 1px solid rgb(255 255 255 / 0.1);
        border-left: 1px solid rgb(255 255 255 / 0.1);
        border-right: 1px solid rgb(255 255 255 / 0.1);

        &:first-child {
          border-top-left-radius: 0.25rem;
          border-top-right-radius: 0.25rem;
        }

        &:last-child {
          border-bottom: 1px solid rgb(255 255 255 / 0.1);
          border-bottom-left-radius: 0.25rem;
          border-bottom-right-radius: 0.25rem;
        }
      }

      .header {
        display: flex;
        background-color: rgb(255 255 255 / 0.05);
        padding: 0.5rem 1rem;
        align-items: center;

        @apply transition-colors;
      }

      :host.hasContent .header:hover {
        background-color: rgb(255 255 255 / 0.1);
      }

      .content {
        display: none;
      }

      :host.open > .content {
        display: block;
        border-top: 1px solid rgb(255 255 255 / 0.1);
      }
    `
  ]
})
export class AccordionItemComponent {
  private readonly parent = inject(AccordionComponent);

  readonly title = input<string>();
  readonly titleClass = input('');
  readonly hasContent = input(true);

  public opened: Subject<symbol> = this.parent.itemOpened;

  public Key = Symbol();

  protected readonly isOpen = signal(false);
  public get open() {
    return this.isOpen();
  }
  public set open(val: boolean) {
    if (!this.hasContent()) return;
    this.isOpen.set(val);
  }

  toggle() {
    if (!this.hasContent()) return;
    if (this.open) {
      // If already opened, we're just closing ourselves and other items are
      // unaffected
      this.open = false;
    } else {
      // Closing, let parent handle everything
      this.opened.next(this.Key);
    }
  }
}
