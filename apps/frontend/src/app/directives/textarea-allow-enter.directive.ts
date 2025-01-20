import { Directive, HostListener } from '@angular/core';

@Directive({ selector: 'textarea', standalone: true })
export class TextareaAllowEnterDirective {
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.stopPropagation();
    }
  }
}
