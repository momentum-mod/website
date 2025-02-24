import { Component, Directive, HostBinding, Input } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Directive({ selector: '[mTab]', standalone: true })
export class TabDirective {
  @Input({ required: true }) tabName!: string;
  @HostBinding('class') classes = 'transition-opacity block';
  @HostBinding('style.opacity') get isHidden() {
    return this.selected ? 1 : 0;
  }

  public selected = false;
}

@Component({
  selector: 'm-tab',
  hostDirectives: [{ directive: TabDirective, inputs: ['tabName'] }],
  template: '<ng-content></ng-content>'
})
export class TabComponent {}
