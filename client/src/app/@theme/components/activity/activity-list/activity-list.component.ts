import {Component, Input, OnInit, Output, EventEmitter} from '@angular/core';
import { Activity_Type } from '../../../../@core/models/activity-type.model';
import {Activity} from '../../../../@core/models/activity.model';

@Component({
  selector: 'activity-list',
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss'],
})
export class ActivityListComponent implements OnInit {

  @Input('activities') activities: Activity[];
  @Input('hasRequested') hasRequested: boolean;
  @Output() showMore = new EventEmitter();

  activityType = Activity_Type; //Exposes enum to template

  constructor() {
    this.hasRequested = false;
    this.activities = [];
  }

  ngOnInit() {
  }

  loadMore(): void {
    this.showMore.emit(null);
  }
}
