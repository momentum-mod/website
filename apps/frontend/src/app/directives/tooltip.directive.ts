import {
  Directive,
  ElementRef,
  Input,
  Renderer2,
  TemplateRef,
  inject,
  ViewContainerRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';

@Directive({
  selector: '[mTooltip]',
  exportAs: 'tooltip',
  standalone: true
})
export class TooltipDirective implements AfterViewInit, OnChanges {
  @Input() tooltipEvent: 'default' | 'noop' = 'default';
  @Input() tooltipPosition: 'top' | 'top span-right' | 'top-span-left' = 'top';
  @Input('mTooltip') content?: string | TemplateRef<any> = undefined;
  @Input() tooltipId?: string;
  @Input() tooltipDuration?: number;
  @Input() tooltipDisabled = false;

  private popoverElement?: HTMLElement;
  private popoverContent?: HTMLElement[];
  private timeoutId?: number;
  private readonly el = inject(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly renderer = inject(Renderer2);

  constructor() {
    this.constructPopover();
  }

  show() {
    if (this.tooltipDisabled || !this.content) return;
    // @ts-expect-error need to update typescript to >v6 for popover API
    this.popoverElement.showPopover({ source: this.el.nativeElement });
  }

  setAndShow(content: string | TemplateRef<any>) {
    this.content = content;
    this.initContent();
    this.show();
  }

  hide() {
    if (this.tooltipDisabled || !this.content) return;
    this.popoverElement.hidePopover();
  }

  private onMouseEnter(_: MouseEvent) {
    this.show();
  }

  private onMouseLeave(_: MouseEvent) {
    this.hide();
  }

  private onToggle(event: ToggleEvent) {
    if (event.newState === 'open' && this.tooltipDuration) {
      this.timeoutId = window?.setTimeout(() => {
        this.popoverElement?.hidePopover();
      }, this.tooltipDuration);
    } else if (event.newState === 'closed' && this.timeoutId) {
      window?.clearTimeout(this.timeoutId);
    }
  }

  private constructPopover() {
    this.popoverElement = this.renderer.createElement('div');
    this.renderer.setAttribute(this.popoverElement, 'popover', 'hint');
    this.renderer.setAttribute(this.popoverElement, 'class', 'm-tooltip');
    this.popoverElement.addEventListener('toggle', this.onToggle.bind(this));
  }

  private initContent() {
    if (this.popoverContent) {
      this.popoverContent.forEach((node) => {
        this.renderer.removeChild(this.popoverElement, node);
      });
      this.popoverContent = undefined;
    }
    if (!this.content) return;
    if (typeof this.content === 'string') {
      this.popoverContent = [this.renderer.createElement('span')];
      this.renderer.appendChild(
        this.popoverContent[0],
        this.renderer.createText(this.content)
      );
    } else {
      const embeddedView = this.vcr.createEmbeddedView(this.content);
      this.popoverContent = embeddedView.rootNodes;
    }
    this.popoverContent.forEach((node) => {
      this.renderer.appendChild(this.popoverElement, node);
    });
    // insert same lvl as host, since popover can't be child of <input />'s
    // shouldn't affect layouts since position: absolute
    this.renderer.insertBefore(
      this.renderer.parentNode(this.el.nativeElement),
      this.popoverElement,
      this.el.nativeElement
    );
  }

  ngAfterViewInit() {
    if (this.tooltipEvent !== 'noop') {
      this.renderer.listen(
        this.el.nativeElement,
        'mouseenter',
        this.onMouseEnter.bind(this)
      );
      this.renderer.listen(
        this.el.nativeElement,
        'mouseleave',
        this.onMouseLeave.bind(this)
      );
    }
    if (this.tooltipPosition !== 'top') {
      this.renderer.setStyle(
        this.popoverElement,
        'position-area',
        this.tooltipPosition
      );
    }
    this.initContent();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      this.initContent();
    }
  }
}
