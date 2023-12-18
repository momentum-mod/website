import { Tooltip as PTooltip } from 'primeng/tooltip';
import { Directive, Input, QueryList, TemplateRef } from '@angular/core';
import { UniqueComponentId } from 'primeng/utils';

/**
 * Overriden PrimeNG Tooltip directive adding extra utilities for
 * programmatically displaying tooltips.
 *
 * https://primeng.org/tooltip
 * https://github.com/primefaces/primeng/blob/master/src/app/components/tooltip/tooltip.ts
 */
@Directive({
  selector: '[mTooltip]',
  // eslint-disable-next-line @angular-eslint/no-host-metadata-property
  host: { class: 'p-element' },
  standalone: true
})
export class TooltipDirective extends PTooltip {
  /**
   * Event to show the tooltip.
   * If any string other than 'hover' or 'focus' are given, it won't register
   * event listeners.
   *
   * @default hover
   */
  @Input() override tooltipEvent: 'hover' | 'focus' | 'noop' | any = 'hover';

  /**
   * Content of the tooltip.
   */
  @Input('mTooltip') override content:
    | string
    | TemplateRef<HTMLElement>
    | undefined;

  /**
   * String by which to distuingish multiple instances in a QueryList
   */
  @Input() tooltipContext?: any;

  /**
   * Overriden position to make `top` the default.
   */
  @Input() override tooltipPosition: 'top' | 'left' | 'right' | 'bottom' =
    'top';

  // Needed to actually override.
  //
  // https://github.com/primefaces/primeng/blob/master/src/app/components/tooltip/tooltip.ts#L117
  override _tooltipOptions = {
    tooltipLabel: null,
    tooltipPosition: 'top', // PrimeNG has this as 'right'.
    tooltipEvent: 'hover',
    appendTo: 'body',
    positionStyle: null,
    tooltipStyleClass: null,
    tooltipZIndex: 'auto',
    escape: true,
    disabled: null,
    showDelay: null,
    hideDelay: null,
    positionTop: null,
    positionLeft: null,
    life: null,
    autoHide: true,
    hideOnEscape: true,
    id: UniqueComponentId() + '_tooltip'
  };

  /**
   * Pick out a specific tooltip from a @ViewChildren querylist based on some
   * property.
   */
  static findByContext(
    tooltips: QueryList<TooltipDirective>,
    context: any
  ): TooltipDirective | undefined {
    return tooltips.find((t) => t.tooltipContext === context);
  }

  /**
   * Set the contents of a tooltip and show it. Duration sets a limit period,
   * if just `true` is given, shows for 2s.
   */
  setAndShow(content: string, duration?: number | true): void {
    this.content = content;
    this.setOption({ tooltipLabel: content });
    this.show();

    // Not messing with underlying tooltipOptions.life stuff, badly documented
    // and can't get to work well.
    if (duration)
      setTimeout(() => this.hide(), duration === true ? 2000 : duration);
  }
}
