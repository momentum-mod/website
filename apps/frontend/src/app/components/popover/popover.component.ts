import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';

@Component({
  selector: 'm-popover',
  template: `
    <div
      #popover
      popover
      [style]="{
        'position-anchor': this.anchorName
      }"
      (toggle)="onToggle($event)"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './popover.component.css'
})
export class PopoverComponent {
  /**
   * https://www.oddbird.net/2025/01/29/anchor-position-validity/
   * an anchor should typically be a sibling element, or sibling to an ancestor, but not a direct ancestor
   */
  @Input() anchorName: string;

  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onShow = new EventEmitter();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onHide = new EventEmitter();

  @ViewChild('popover') popover: ElementRef<HTMLElement>;

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
    this.popover.nativeElement.showPopover();
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
