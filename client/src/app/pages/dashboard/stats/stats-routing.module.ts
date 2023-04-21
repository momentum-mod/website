import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { RoleGuard } from '../../../@core/guards/role.guard';
import { NotFoundDashboardComponent } from '../../not-found/dashboard/not-found-dashboard.component';
import { StatsComponent } from './stats.component';
import { GlobalStatsComponent } from './global-stats/global-stats.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: StatsComponent,
        children: [
          { path: '', component: GlobalStatsComponent },
          { path: '**', component: NotFoundDashboardComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule],
  providers: [RoleGuard]
})
export class StatsRoutingModule {}
