import { Component } from '@angular/core';
import { ActivityCardComponent } from '../../../components/activity/activity-card/activity-card.component';

@Component({
  selector: 'mom-community-activity',
  templateUrl: './community-activity.component.html',
  styleUrls: ['./community-activity.component.scss'],
  standalone: true,
  imports: [ActivityCardComponent]
})
export class CommunityActivityComponent {}
