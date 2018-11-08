import { Component, OnInit } from '@angular/core';
import {Activity} from '../../../../@core/models/activity.model';
import {ActivityService} from '../../../../@core/data/activity.service';

@Component({
  selector: 'community-activity',
  templateUrl: './community-activity.component.html',
  styleUrls: ['./community-activity.component.scss'],
})
export class CommunityActivityComponent implements OnInit {

  activities: Activity[];
  hasRequested: boolean;
  constructor(private actService: ActivityService) {
    this.activities = [];
    this.hasRequested = false;
  }

  ngOnInit() {
    this.actService.getRecentActivity().subscribe(resp => {
      this.activities = resp.activities;
      this.hasRequested = true;
    });
  }

}
