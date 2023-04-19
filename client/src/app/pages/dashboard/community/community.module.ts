import { NgModule } from '@angular/core';
import { CommunityRoutingModule } from './community-routing.module';
import { CommunityComponent } from './community.component';
import { CommunityNewsComponent } from './community-news/community-news.component';
import { CommunityTwitchStreamComponent } from './community-twitch-stream/community-twitch-stream.component';
import { CommunityActivityComponent } from './community-activity/community-activity.component';
import { ThemeModule } from '../../../@theme/theme.module';
import { NotFoundModule } from '../../not-found/not-found.module';
import { TwitchDataComponent } from './community-twitch-stream/twitch-data/twitch-data.component';

@NgModule({
  imports: [ThemeModule, NotFoundModule, CommunityRoutingModule],
  declarations: [
    CommunityComponent,
    CommunityNewsComponent,
    CommunityTwitchStreamComponent,
    CommunityActivityComponent,
    TwitchDataComponent
  ]
})
export class CommunityModule {}
