import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NotFoundDashboardComponent } from '../../not-found/dashboard/not-found-dashboard.component';
import { CommunityComponent } from './community.component';
import { CommunityNewsComponent } from './community-news/community-news.component';
import { CommunityTwitchStreamComponent } from './community-twitch-stream/community-twitch-stream.component';
import { CommunityActivityComponent } from './community-activity/community-activity.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: CommunityComponent,
        children: [
          { path: 'news', component: CommunityNewsComponent },
          { path: 'twitch', component: CommunityTwitchStreamComponent },
          { path: 'activity', component: CommunityActivityComponent },
          { path: '**', component: NotFoundDashboardComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class CommunityRoutingModule {}
