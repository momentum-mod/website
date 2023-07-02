import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NotFoundDashboardComponent } from '../../not-found/dashboard/not-found-dashboard.component';
import { StatsComponent } from './stats.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: StatsComponent,
        children: [{ path: '**', component: NotFoundDashboardComponent }]
      }
    ])
  ],
  exports: [RouterModule]
})
export class StatsRoutingModule {}
