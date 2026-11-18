import { Component, ElementRef, inject, input, output } from '@angular/core';

@Component({
  selector: 'm-popover',
  template: '<ng-content />',
  host: {
    popover: '',
    '(toggle)': 'onToggle($event)'
  },
  styleUrl: './popover.component.css'
})
export class PopoverComponent {
  /**
   * https://www.oddbird.net/2025/01/29/anchor-position-validity/
   * an anchor should typically be a sibling element, or sibling to an ancestor, but not a direct ancestor
   */
  readonly anchor = input<HTMLElement>();

  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  readonly onShow = output();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  readonly onHide = output();

  private readonly popover: ElementRef<HTMLElement> = inject(ElementRef);

  private active = false;

  onToggle(event: ToggleEvent) {
    if (event.newState === 'open') {
      this.active = true;
      this.onShow.emit();
    } else {
      this.active = false;
      this.onHide.emit();
    }
  }

  show() {
    // this creates implicit popovertarget/anchor association between elements, rather than needing to set in css
    this.popover.nativeElement.showPopover({ source: this.anchor() });
  }

  hide() {
    this.popover.nativeElement.hidePopover();
  }

  toggle() {
    if (this.active) {
      this.hide();
    } else {
      this.show();
    }
    // only works when popover="manual"
    // this.popover.nativeElement.togglePopover();
  }
}
