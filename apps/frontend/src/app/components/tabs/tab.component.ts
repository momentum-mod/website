import { Component, Directive, input, signal } from '@angular/core';

@Directive({
  selector: '[mTab]',
  standalone: true,
  host: {
    class: 'transition-opacity block',
    '[style.opacity]': 'selected() ? 1 : 0'
  }
})
export class TabDirective {
  readonly tabName = input.required<string>();

  public readonly selected = signal(false);
}

@Component({
  selector: 'm-tab',
  hostDirectives: [{ directive: TabDirective, inputs: ['tabName'] }],
  template: '<ng-content></ng-content>'
})
export class TabComponent {}
