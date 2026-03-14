import { Route } from '@angular/router';
import { CommunityNewsComponent } from './community-news/community-news.component';
import { CommunityTwitchStreamComponent } from './community-twitch-stream/community-twitch-stream.component';
import { RankingsComponent } from './rankings/rankings.component';

export default [
  { path: 'news', component: CommunityNewsComponent, title: 'Community News' },
  {
    path: 'twitch',
    component: CommunityTwitchStreamComponent,
    title: 'Twitch Streams'
  },
  {
    path: 'rankings',
    component: RankingsComponent,
    title: 'Rankings'
  }
] satisfies Route[];
