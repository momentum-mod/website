import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommunityComponent } from './community.component';
import { CommunityNewsComponent } from './community-news/community-news.component';
import { CommunityTwitchStreamComponent } from './community-twitch-stream/community-twitch-stream.component';
import { CommunityActivityComponent } from './community-activity/community-activity.component';
import { NotFoundComponent } from '../not-found/not-found.component';

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
          { path: '**', component: NotFoundComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class CommunityRoutingModule {}
