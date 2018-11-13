import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import {DashboardComponent} from './dashboard.component';
import {DashboardHomeComponent} from './home/dashboard-home.component';
import {UserListComponent} from './user-list/user-list.component';
import {CommunityListComponent} from './community/community-list.component';
import {NotFoundDashboardComponent} from '../not-found/dashboard/not-found-dashboard.component';
import {UserProfileComponent} from './profile/user-profile.component';
import {ProfileEditComponent} from './profile/profile-edit/profile-edit.component';
import {PermissionGuard} from '../../@core/guards/permission.guard';
import {Permission} from '../../@core/models/permissions.model';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: 'users',
        component: UserListComponent,
      },
      {
        path: 'maps',
        loadChildren: 'app/pages/dashboard/maps/map.module#MapModule',
      },
      {
        path: 'stats',
        loadChildren: 'app/pages/dashboard/stats/stats.module#StatsModule',
      },
      {
        path: 'community',
        component: CommunityListComponent,
      },
      {
        path: 'profile',
        children: [
          {
            path: '',
            component: UserProfileComponent,
          },
          {
            path: 'edit',
            component: ProfileEditComponent,
          },
          {
            path: ':id',
            component: UserProfileComponent,
          },
        ],
      },
      {
        path: 'admin',
        loadChildren: 'app/pages/dashboard/admin/admin.module#AdminModule',
        canActivate: [PermissionGuard],
        data: {
          onlyAllow: [Permission.MODERATOR | Permission.ADMIN],
        },
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
  providers: [PermissionGuard],
})
export class DashboardRoutingModule {
}
