import { Route } from '@angular/router';
import { Role } from '@momentum/constants';
import { RoleGuard } from '../../guards/role.guard';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
import { ProfileComponent } from './profile.component';
import { ProfileRedirectComponent } from './profile-redirect.component';
import { AuthGuard } from '../../guards/auth.guard';

export default [
  {
    path: '',
    component: ProfileRedirectComponent,
    title: 'Your Profile',
    canActivate: [AuthGuard]
  },
  {
    path: 'edit',
    component: ProfileEditComponent,
    title: 'Edit Profile',
    canActivate: [AuthGuard]
  },
  {
    path: ':id',
    children: [
      { path: '', component: ProfileComponent },
      {
        path: 'edit',
        component: ProfileEditComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [Role.MODERATOR, Role.ADMIN] }
      }
    ]
  }
] satisfies Route[];
