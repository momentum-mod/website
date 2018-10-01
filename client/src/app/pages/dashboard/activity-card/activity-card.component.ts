import {Component, Input} from '@angular/core';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
})

export class ActivityCardComponent {
  @Input('header') headerTitle: string;
  constructor() {
    this.headerTitle = 'Activity';
  }
}
