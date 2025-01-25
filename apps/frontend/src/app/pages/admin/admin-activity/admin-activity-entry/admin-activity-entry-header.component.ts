import { Component, Input } from '@angular/core';
import { AdminActivity } from '@momentum/constants';
import { AdminActivityEntryData } from './admin-activity-entry.component';
import { SharedModule } from '../../../../shared.module';
import { TimeAgoPipe } from '../../../../pipes/time-ago.pipe';

@Component({
  selector: 'm-admin-activity-entry-header',
  template: `
    <div class="flex h-[40px] flex-wrap items-center gap-1">
      <a routerLink="/profile/{{ activity.userID }}" class="contents">
        <m-avatar [url]="activity.user.avatarURL" class="mr-2 !h-7" />
        <p>{{ activity.user.alias }}</p>
      </a>
      <p>{{ activityData.actionText }}</p>
      <p
        [ngStyle]="{ cursor: activityData.targetLink ? 'pointer' : 'auto' }"
        [routerLink]="activityData.targetLink ? activityData.targetLink : null"
      >
        <b>{{ activityData.targetName }}</b>
      </p>

      <p class="ml-auto">{{ activity.createdAt | timeAgo }}</p>
    </div>
  `,
  imports: [SharedModule, TimeAgoPipe]
})
export class AdminActivityEntryHeaderComponent {
  @Input({ required: true }) activity: AdminActivity;
  @Input({ required: true }) activityData: AdminActivityEntryData;
}
