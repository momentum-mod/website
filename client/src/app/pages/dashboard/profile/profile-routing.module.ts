import {RouterModule, Routes} from '@angular/router';
import {UserProfileComponent} from './user-profile.component';
import {ProfileEditComponent} from './profile-edit/profile-edit.component';
import {Permission} from '../../../@core/models/permissions.model';
import {PermissionGuard} from '../../../@core/guards/permission.guard';
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
              onlyAllow: [Permission.MODERATOR, Permission.ADMIN],
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
  providers: [PermissionGuard],
})
export class ProfileRoutingModule {
}
