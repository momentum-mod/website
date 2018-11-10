import {Component, Input, OnInit} from '@angular/core';
import {Activity} from '../../../../@core/models/activity.model';

@Component({
  selector: 'activity-list',
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss'],
})
export class ActivityListComponent implements OnInit {

  @Input('activities') activities: Activity[];
  @Input('hasRequested') hasRequested: boolean;
  constructor() {
    this.hasRequested = false;
    this.activities = [];
  }

  ngOnInit() {
  }

}
