import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardHomeComponent } from './home/dashboard-home.component';
import { NotFoundDashboardComponent } from '../not-found/dashboard/not-found-dashboard.component';
import { RunInfoComponent } from './runs/run-info/run-info.component';
import { AuthGuard } from '../../guards/auth.guard';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: DashboardComponent,
        canActivate: [AuthGuard],
        children: [
          {
            path: 'maps',
            loadChildren: () =>
              import('./maps/map.module').then((m) => m.MapModule)
          },
          {
            path: 'stats',
            loadChildren: () =>
              import('./stats/stats.module').then((m) => m.StatsModule)
          },
          {
            path: 'community',
            loadChildren: () =>
              import('./community/community.module').then(
                (m) => m.CommunityModule
              )
          },
          {
            path: 'profile',
            loadChildren: () =>
              import('./profile/profile.module').then((m) => m.ProfileModule)
          },
          {
            path: 'admin',
            loadChildren: () =>
              import('./admin/admin.module').then((m) => m.AdminModule)
          },
          {
            path: 'runs',
            children: [
              {
                path: ':id',
                component: RunInfoComponent
              }
            ]
          },
          {
            path: '',
            component: DashboardHomeComponent
          },
          {
            path: '**',
            component: NotFoundDashboardComponent
          }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
