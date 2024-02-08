import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'm-card-body',
  standalone: true,
  styles: [':host {display: block;}'],
  template: '<ng-content></ng-content>'
})
export class CardBodyComponent {
  @HostBinding('class') class = 'm-card';
}
