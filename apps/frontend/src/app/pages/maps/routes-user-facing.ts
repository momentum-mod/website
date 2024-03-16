import { Route } from '@angular/router';
import { MapBrowserComponent } from './browsers/map-browser.component';
import { MapInfoComponent } from './map-info/map-info.component';
import { MapSubmissionBrowserComponent } from './browsers/map-submission-browser.component';
import { UserMapsBrowserComponent } from './browsers/user-maps-browser.component';

export default [
  {
    path: '',
    component: MapBrowserComponent,
    title: 'Maps'
  },
  {
    path: 'beta',
    component: MapSubmissionBrowserComponent,
    title: 'Beta Maps'
  },
  {
    path: 'submissions',
    component: UserMapsBrowserComponent,
    title: 'Your Maps'
  },
  {
    path: ':name',
    component: MapInfoComponent
  }
] satisfies Route[];
