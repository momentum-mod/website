import {
  Directive,
  OnChanges,
  HostBinding,
  ElementRef,
  inject,
  input
} from '@angular/core';

/**
 * Directive for smoothly animating heights of components.
 * The `mSmoothHeight` animation must be provided to the *parent* component to
 * work.
 *
 * This will forcible set the component to `display: block`!
 *
 * Based on https://stackoverflow.com/a/52277742
 */
@Directive({ selector: '[mSmoothHeight]', standalone: true })
export class SmoothHeightAnimDirective implements OnChanges {
  private readonly elRef = inject(ElementRef);

  readonly mSmoothHeight = input<boolean>();
  readonly display = input('block');
  private pulse: boolean;
  private startHeight: number;

  @HostBinding('@grow')
  get grow() {
    return { value: this.pulse, params: { startHeight: this.startHeight } };
  }

  @HostBinding('style') get styles(): CSSStyleDeclaration {
    return {
      display: this.display(),
      overflow: 'hidden'
    } as CSSStyleDeclaration;
  }

  setStartHeight() {
    this.startHeight = this.elRef.nativeElement.clientHeight;
  }

  ngOnChanges() {
    this.setStartHeight();
    this.pulse = !this.pulse;
  }
}
