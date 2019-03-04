import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {NotFoundDashboardComponent} from '../../not-found/dashboard/not-found-dashboard.component';
import {MapQueueComponent} from './map-queue/map-queue.component';
import {AdminComponent} from './admin.component';
import {ReportQueueComponent} from './report-queue/report-queue.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: 'map-queue',
        pathMatch: 'full',
        component: MapQueueComponent,
      },
      {
        path: 'report-queue',
        pathMatch: 'full',
        component: ReportQueueComponent,
      },
      {
        path: '**',
        component: NotFoundDashboardComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {
}
