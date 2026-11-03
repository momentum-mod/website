import {
  Component,
  Directive,
  HostBinding,
  Input,
  signal
} from '@angular/core';

@Directive({ selector: '[mTab]', standalone: true })
export class TabDirective {
  @Input({ required: true }) tabName!: string;
  @HostBinding('class') classes = 'transition-opacity block';
  @HostBinding('style.opacity') get isHidden() {
    return this.selected() ? 1 : 0;
  }

  public readonly selected = signal(false);
}

@Component({
  selector: 'm-tab',
  hostDirectives: [{ directive: TabDirective, inputs: ['tabName'] }],
  template: '<ng-content></ng-content>'
})
export class TabComponent {}
