import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  Input
} from '@angular/core';
import { NgClass } from '@angular/common';
import { IconComponent } from '../../icons';
import { Subject } from 'rxjs';

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

        @apply transition-colors;

        &:hover {
          background-color: rgb(255 255 255 / 0.1);
        }
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
  imports: [NgClass, IconComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccordionItemComponent {
  @Input() title: string;
  @Input() titleClass = '';

  @Input() hasContent = true;

  public opened: Subject<symbol>;

  public Key = Symbol();

  @HostBinding('class.open')
  private _open: boolean;
  public get open() {
    return this._open;
  }
  public set open(val: boolean) {
    this._open = val;
    this.cdRef.markForCheck();
  }

  constructor(private readonly cdRef: ChangeDetectorRef) {}

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
