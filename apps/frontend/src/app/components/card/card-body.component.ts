import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'm-card-body',
  template: '<ng-content></ng-content>'
})
export class CardBodyComponent {
  @HostBinding('class') class = 'card-body';
}
