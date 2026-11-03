import { Directive, HostListener } from '@angular/core';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'form[preventEnterSubmit]',
  standalone: true
})
export class PreventEnterSubmitDirective {
  @HostListener('keydown.enter', ['$event'])
  onKeyDown(event: Event): void {
    event.preventDefault();
  }
}
