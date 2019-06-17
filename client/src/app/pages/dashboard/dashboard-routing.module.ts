import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {DashboardComponent} from './dashboard.component';
import {DashboardHomeComponent} from './home/dashboard-home.component';
import {NotFoundDashboardComponent} from '../not-found/dashboard/not-found-dashboard.component';
import {RoleGuard} from '../../@core/guards/role.guard';
import {Role} from '../../@core/models/role.model';
import {RunInfoComponent} from './runs/run-info/run-info.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: 'maps',
        loadChildren: () => import('app/pages/dashboard/maps/map.module').then(m => m.MapModule),
      },
      {
        path: 'stats',
        loadChildren: () => import('app/pages/dashboard/stats/stats.module').then(m => m.StatsModule),
      },
      {
        path: 'community',
        loadChildren: () => import('app/pages/dashboard/community/community.module').then(m => m.CommunityModule),
      },
      {
        path: 'profile',
        loadChildren: () => import('app/pages/dashboard/profile/profile.module').then(m => m.ProfileModule),
      },
      {
        path: 'admin',
        loadChildren: () => import('app/pages/dashboard/admin/admin.module').then(m => m.AdminModule),
        canActivate: [RoleGuard],
        data: {
          onlyAllow: [
            Role.MODERATOR,
            Role.ADMIN,
          ],
        },
      },
      {
        path: 'runs',
        children: [
          {
            path: ':id',
            component: RunInfoComponent,
          },
        ],
      },
      {
        path: '',
        component: DashboardHomeComponent,
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
  providers: [RoleGuard],
})
export class DashboardRoutingModule {
}
