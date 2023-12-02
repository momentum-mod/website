import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Activity } from '@momentum/constants';
import { ActivityContentComponent } from '../activity-content/activity-content.component';
import { NgIf, NgFor } from '@angular/common';
import { NbListModule } from '@nebular/theme';

@Component({
  selector: 'mom-activity-list',
  templateUrl: './activity-list.component.html',
  standalone: true,
  imports: [NbListModule, NgIf, NgFor, ActivityContentComponent]
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
