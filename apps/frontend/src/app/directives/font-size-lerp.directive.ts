import { Directive, HostBinding, Input, OnChanges } from '@angular/core';

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
@Directive({ selector: '[fontSizeLerp]', standalone: true })
export class FontSizeLerpDirective implements OnChanges {
  @Input('fontSizeLerp') options: {
    chars: number;
    maxChars: number;
    startAt: number;
    baseRem: number;
    minRem: number;
  };

  @HostBinding('style.font-size') fontSize: string;

  ngOnChanges() {
    const { chars, maxChars, startAt, baseRem, minRem } = this.options;
    let val = baseRem;
    if (chars > startAt) {
      const k = (chars - startAt) / (maxChars - startAt);
      val -= (baseRem - minRem) * k;
    }
    this.fontSize = `${val}rem`;
  }
}
