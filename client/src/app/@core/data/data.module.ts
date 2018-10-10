import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CookieService } from 'ngx-cookie-service';
import { JwtModule } from '@auth0/angular-jwt';

import { UserService } from './user.service';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { StateService } from './state.service';
import { SmartTableService } from './smart-table.service';
import { LayoutService } from './layout.service';
import {ProfileService} from './profile.service';

const SERVICES = [
  UserService,
  UsersService,
  ProfileService,
  AuthService,
  JwtModule,
  CookieService,
  StateService,
  SmartTableService,
  LayoutService,
];

export function tokenGetter() {
  return localStorage.getItem('accessToken');
}

@NgModule({
  imports: [
    CommonModule,
    JwtModule.forRoot({
      config: {
          tokenGetter: tokenGetter,
          whitelistedDomains: ['localhost:4200'],
          // blacklistedRoutes: ['localhost:4200']
      },
    }),
  ],
  providers: [
    ...SERVICES,
  ],
})
export class DataModule {
  static forRoot(): ModuleWithProviders {
    return <ModuleWithProviders>{
      ngModule: DataModule,
      providers: [
        ...SERVICES,
      ],
    };
  }
}
