import { Route } from '@angular/router';
import { MapBrowserComponent } from './browsers/map-browser.component';
import { MapInfoComponent } from './map-info/map-info.component';
import { MapSubmissionBrowserComponent } from './browsers/map-submission-browser.component';
import { UserMapsBrowserComponent } from './browsers/user-maps-browser.component';
import { AuthGuard } from '../../guards/auth.guard';
import { LimitedGuard } from '../../guards/limited.guard';

export default [
  {
    path: '',
    component: MapBrowserComponent,
    title: 'Maps'
  },
  {
    path: 'beta',
    component: MapSubmissionBrowserComponent,
    title: 'Beta Maps',
    canActivate: [AuthGuard]
  },
  {
    path: 'submissions',
    component: UserMapsBrowserComponent,
    title: 'Your Maps',
    canActivate: [AuthGuard, LimitedGuard]
  },
  {
    path: ':name',
    component: MapInfoComponent
  }
] satisfies Route[];
