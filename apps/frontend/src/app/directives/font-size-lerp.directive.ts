import { Directive, HostBinding, OnChanges, input } from '@angular/core';

/**
 * Doing this automatically is so annoying, and requires fucking with the DOM
 * more than I like.
 *
 * There's some Angular directives out there for it:
 *   - https://github.com/sollenne/angular-fittext
 *   - https://github.com/thisloke/ng2-fittext
 *
 * I couldn't get them working very well, so this is good enough for the time
 * being.
 */
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[fontSizeLerp]', standalone: true })
export class FontSizeLerpDirective implements OnChanges {
  readonly options = input<{
    chars: number;
    startAt: number;
    baseRem: number;
  }>(undefined, { alias: 'fontSizeLerp' });

  @HostBinding('style.font-size') fontSize: string;

  ngOnChanges() {
    const { chars, startAt, baseRem } = this.options();
    let val = baseRem;
    if (chars > startAt) {
      val = (baseRem * startAt) / chars;
    }
    // Elements can set --font-lerp-scale to shrink the result, e.g. on mobile.
    this.fontSize = `calc(${val}rem * var(--font-lerp-scale, 1))`;
  }
}
