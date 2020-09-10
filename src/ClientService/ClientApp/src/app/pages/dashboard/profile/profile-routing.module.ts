import {RouterModule, Routes} from '@angular/router';
import {UserProfileComponent} from './user-profile.component';
import {ProfileEditComponent} from './profile-edit/profile-edit.component';
import {Role} from '../../../@core/models/role.model';
import {RoleGuard} from '../../../@core/guards/role.guard';
import {NotFoundDashboardComponent} from '../../not-found/dashboard/not-found-dashboard.component';
import {NgModule} from '@angular/core';
import {ProfileComponent} from './profile.component';

const routes: Routes = [
  {
    path: '',
    component: ProfileComponent,
    children: [
      {
        path: 'edit',
        component: ProfileEditComponent,
      },
      {
        path: ':id',
        children: [
          {
            path: '',
            component: UserProfileComponent,
          },
          {
            path: 'edit',
            component: ProfileEditComponent,
            data: {
              onlyAllow: [Role.MODERATOR, Role.ADMIN],
            },
          },
        ],
      },
      {
        path: '',
        component: UserProfileComponent,
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
export class ProfileRoutingModule {
}
