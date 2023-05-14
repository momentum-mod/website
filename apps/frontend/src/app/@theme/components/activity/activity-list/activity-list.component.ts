import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Activity } from '@momentum/types';

@Component({
  selector: 'mom-activity-list',
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss']
})
export class ActivityListComponent {
  @Input() activities: Activity[];
  @Input() hasRequested: boolean;
  @Output() showMore = new EventEmitter();

  constructor() {
    this.hasRequested = false;
    this.activities = [];
  }

  loadMore(): void {
    this.showMore.emit(null);
  }
}
