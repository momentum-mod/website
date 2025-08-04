import {
  Directive,
  HostListener,
  Renderer2,
  ElementRef,
  inject
} from '@angular/core';

@Directive({
  selector: '[dynamicTextareaHeight]'
})
export class DynamicTextareaHeightDirective {
  private readonly renderer = inject(Renderer2);
  private elRef = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);

  @HostListener('input')
  // Also reset if textarea gets cleared, e.g. on submit.
  // NOTE: does not catch enter submit for some browsers.
  @HostListener('selectionchange')
  updateHeight() {
    // This is needed to contract height if text was removed.
    this.renderer.setStyle(this.elRef.nativeElement, 'height', 'auto');

    this.renderer.setStyle(
      this.elRef.nativeElement,
      'height',
      `${this.elRef.nativeElement.scrollHeight}px`
    );
  }
}
