import { Route } from '@angular/router';
import { ReportQueueComponent } from './report-queue/report-queue.component';
import { AdminActivityComponent } from './admin-activity/admin-activity.component';
import { UtilitiesComponent } from './utilities/utilities.component';
import { AdminMapsBrowserComponent } from '../maps/browsers/admin-maps-browser.component';

export default [
  {
    path: 'maps',
    component: AdminMapsBrowserComponent,
    title: 'Maps (Admin)'
  },
  {
    path: 'reports',
    component: ReportQueueComponent,
    title: 'Reports'
  },
  {
    path: 'activity',
    component: AdminActivityComponent,
    title: 'Admin Activity'
  },
  {
    path: 'utilities',
    component: UtilitiesComponent,
    title: 'Admin Utilities'
  }
] satisfies Route[];
