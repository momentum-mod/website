import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  HostBinding,
  Inject,
  Input
} from '@angular/core';
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
  template: `
    <button type="button" (click)="toggle()" class="header">
      @if (title) {
        <p [class]="'text-lg' + titleClass">
          {{ title }}
        </p>
      } @else {
        <ng-content select="[header]"></ng-content>
      }
      @if (hasContent) {
        <m-icon class="ml-auto" [icon]="open ? 'chevron-up' : 'chevron-down'" />
      }
    </button>
    <div class="content">
      <ng-content />
    </div>
  `,
  styles: [
    `
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccordionItemComponent {
  @Input() title: string;
  @Input() titleClass = '';

  @HostBinding('class.hasContent')
  @Input()
  hasContent = true;

  public opened: Subject<symbol> = this.parent.itemOpened;

  public Key = Symbol();

  @HostBinding('class.open') // TODO: this *probably* the buggy
  private _open = false;
  public get open() {
    return this._open;
  }
  public set open(val: boolean) {
    if (!this.hasContent) return;
    this._open = val;
    this.cdRef.detectChanges();
  }

  constructor(
    @Inject(forwardRef(() => AccordionComponent))
    private readonly parent: AccordionComponent,
    private readonly cdRef: ChangeDetectorRef
  ) {}

  toggle() {
    if (!this.hasContent) return;
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
