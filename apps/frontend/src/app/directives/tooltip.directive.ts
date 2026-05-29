import {
  Directive,
  ElementRef,
  Renderer2,
  TemplateRef,
  inject,
  input,
  linkedSignal,
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
  readonly tooltipEvent = input<'default' | 'noop'>('default');
  readonly tooltipPosition = input<'top' | 'top span-right' | 'top-span-left'>(
    'top'
  );
  readonly contentInput = input<string | TemplateRef<any> | undefined>(
    undefined,
    { alias: 'mTooltip' }
  );
  readonly tooltipId = input<string>();
  readonly tooltipDuration = input<number>();
  readonly tooltipDisabled = input(false);

  // setAndShow overrides the bound content until the binding next changes.
  private readonly content = linkedSignal(() => this.contentInput());

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
    if (this.tooltipDisabled() || !this.content()) return;
    this.popoverElement.showPopover({ source: this.el.nativeElement });
  }

  setAndShow(content: string | TemplateRef<any>) {
    this.content.set(content);
    this.initContent();
    this.show();
  }

  hide() {
    if (this.tooltipDisabled() || !this.content()) return;
    this.popoverElement.hidePopover();
  }

  private onMouseEnter(_: MouseEvent) {
    this.show();
  }

  private onMouseLeave(_: MouseEvent) {
    this.hide();
  }

  private onToggle(event: ToggleEvent) {
    const duration = this.tooltipDuration();

    if (event.newState === 'open' && duration) {
      this.timeoutId = window?.setTimeout(
        () => this.popoverElement?.hidePopover(),
        duration
      );
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
      this.popoverContent.forEach((node) =>
        this.renderer.removeChild(this.popoverElement, node)
      );
      this.popoverContent = undefined;
    }

    const content = this.content();
    if (!content) return;

    if (typeof content === 'string') {
      this.popoverContent = [this.renderer.createElement('span')];
      this.renderer.appendChild(
        this.popoverContent[0],
        this.renderer.createText(content)
      );
    } else {
      const embeddedView = this.vcr.createEmbeddedView(content);
      this.popoverContent = embeddedView.rootNodes;
    }

    this.popoverContent.forEach((node) =>
      this.renderer.appendChild(this.popoverElement, node)
    );

    // Insert same lvl as host, since popover can't be child of <input />'s.
    // Shouldn't affect layouts since position: absolute.
    this.renderer.insertBefore(
      this.renderer.parentNode(this.el.nativeElement),
      this.popoverElement,
      this.el.nativeElement
    );
  }

  ngAfterViewInit() {
    if (this.tooltipEvent() !== 'noop') {
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

    const position = this.tooltipPosition();
    if (position !== 'top')
      this.renderer.setStyle(this.popoverElement, 'position-area', position);

    this.initContent();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['contentInput']) {
      this.initContent();
    }
  }
}
