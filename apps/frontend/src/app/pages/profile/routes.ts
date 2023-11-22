import { Route } from '@angular/router';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
import { ProfileComponent } from './profile.component';
import { Role } from '@momentum/constants';
import { ProfileRedirectComponent } from './profile-redirect.component';
import { RoleGuard } from '../../guards/role.guard';

export default [
  { path: '', component: ProfileRedirectComponent },
  { path: 'edit', component: ProfileEditComponent },
  {
    path: ':id',
    children: [
      { path: '', component: ProfileComponent },
      {
        path: 'edit',
        component: ProfileEditComponent,
        canActivate: [RoleGuard],
        data: { roles: [Role.MODERATOR, Role.ADMIN] }
      }
    ]
  }
] satisfies Route[];
