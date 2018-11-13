import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {PermissionGuard} from '../../../@core/guards/permission.guard';
import {NotFoundDashboardComponent} from '../../not-found/dashboard/not-found-dashboard.component';
import {StatsComponent} from './stats.component';
import {GlobalStatsComponent} from './global-stats/global-stats.component';

const routes: Routes = [
  {
    path: '',
    component: StatsComponent,
    children: [
      {
        path: '',
        component: GlobalStatsComponent,
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
  providers: [PermissionGuard],
})
export class StatsRoutingModule {
}
