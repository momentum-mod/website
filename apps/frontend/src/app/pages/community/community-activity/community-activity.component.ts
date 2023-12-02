import { Component } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { ActivityCardComponent } from '../../../components/activity/activity-card/activity-card.component';

@Component({
  selector: 'mom-community-activity',
  templateUrl: './community-activity.component.html',
  standalone: true,
  imports: [SharedModule, ActivityCardComponent]
})
export class CommunityActivityComponent {}
