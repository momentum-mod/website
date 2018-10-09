import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import {DashboardComponent} from './dashboard.component';
import {DashboardHomeComponent} from './home/dashboard-home.component';
import {UserListComponent} from './user-list/user-list.component';
import {CommunityHomeComponent} from './community/community-home.component';
import {NotFoundDashboardComponent} from '../not-found/dashboard/not-found-dashboard.component';
import {UserProfileComponent} from './profile/user-profile.component';

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
        path: 'community',
        component: CommunityHomeComponent,
      },
      {
        path: 'profile',
        component: UserProfileComponent,
        children: [
          {
            path: ':id',
            component: UserProfileComponent,
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
})
export class DashboardRoutingModule {
}
