import { Route } from '@angular/router';
import { CommunityNewsComponent } from './community-news/community-news.component';
import { CommunityTwitchStreamComponent } from './community-twitch-stream/community-twitch-stream.component';
import { CommunityActivityComponent } from './community-activity/community-activity.component';

export default [
  { path: 'news', component: CommunityNewsComponent },
  { path: 'twitch', component: CommunityTwitchStreamComponent },
  { path: 'activity', component: CommunityActivityComponent }
] satisfies Route[];
