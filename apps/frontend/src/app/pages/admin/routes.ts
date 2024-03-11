import { Route } from '@angular/router';
import { ReportQueueComponent } from './report-queue/report-queue.component';
import { AdminActivityComponent } from './admin-activity/admin-activity.component';
import { UtilitiesComponent } from './utilities/utilities.component';

export default [
  {
    path: 'report-queue',
    pathMatch: 'full',
    component: ReportQueueComponent
  },
  {
    path: 'admin-activity',
    children: [
      { path: '', component: AdminActivityComponent },
      { path: ':adminID', component: AdminActivityComponent }
    ]
  },
  { path: 'utilities', component: UtilitiesComponent }
] satisfies Route[];
