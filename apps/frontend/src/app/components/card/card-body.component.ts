import { Component } from '@angular/core';

@Component({
  selector: 'm-card-body',
  host: { class: 'card-body' },
  template: '<ng-content></ng-content>'
})
export class CardBodyComponent {}
