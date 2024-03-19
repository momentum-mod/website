import { Route } from '@angular/router';
import { CommunityNewsComponent } from './community-news/community-news.component';
import { CommunityTwitchStreamComponent } from './community-twitch-stream/community-twitch-stream.component';

export default [
  { path: 'news', component: CommunityNewsComponent, title: 'Community News' },
  {
    path: 'twitch',
    component: CommunityTwitchStreamComponent,
    title: 'Twitch Streams'
  }
] satisfies Route[];
