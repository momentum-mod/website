import { Component } from '@angular/core';
import { ActivityComponent } from '../../../components/activity/activity.component';

@Component({
  selector: 'm-community-activity',
  template: `<m-activity
    headerTitle="Recent Activity"
    [activityFetchType]="'all'"
    height="36rem"
  />`,
  standalone: true,
  imports: [ActivityComponent]
})
export class CommunityActivityComponent {}
