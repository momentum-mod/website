import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Activity } from '../../../../@core/models/activity.model';

@Component({
  selector: 'activity-list',
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss']
})
export class ActivityListComponent implements OnInit {
  @Input() activities: Activity[];
  @Input() hasRequested: boolean;
  @Output() showMore = new EventEmitter();

  constructor() {
    this.hasRequested = false;
    this.activities = [];
  }

  ngOnInit() {}

  loadMore(): void {
    this.showMore.emit(null);
  }
}
