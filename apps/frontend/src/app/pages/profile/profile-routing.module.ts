import { RouterModule } from '@angular/router';
import { UserProfileComponent } from './user-profile.component';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
import { NgModule } from '@angular/core';
import { ProfileComponent } from './profile.component';
import { Role } from '@momentum/constants';
import { ProfileRedirectComponent } from './profile-redirect.component';
import { NotFoundComponent } from '../not-found/not-found.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: ProfileComponent,
        children: [
          { path: 'edit', component: ProfileEditComponent },
          {
            path: ':id',
            children: [
              { path: '', component: UserProfileComponent },
              {
                path: 'edit',
                component: ProfileEditComponent,
                data: { onlyAllow: [Role.MODERATOR, Role.ADMIN] }
              }
            ]
          },
          { path: '', component: ProfileRedirectComponent },
          { path: '**', component: NotFoundComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class ProfileRoutingModule {}
