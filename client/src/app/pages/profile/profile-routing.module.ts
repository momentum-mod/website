import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProfileComponent } from './profile.component';
import { ProfileCardComponent } from './profile-card/profile-card.component';

const routes: Routes = [{
  path: '',
  component: ProfileComponent,
  children: [{
    path: 'profile-card',
    component: ProfileCardComponent,
  }],
}];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [
    RouterModule,
  ],
})
export class ProfileRoutingModule {

}

export const routedComponents = [
  ProfileComponent,
  ProfileCardComponent,
];
