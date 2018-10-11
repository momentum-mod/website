import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CookieService } from 'ngx-cookie-service';

import { LocalUserService } from './local-user.service';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { StateService } from './state.service';
import { SmartTableService } from './smart-table.service';
import { LayoutService } from './layout.service';
import {ProfileService} from './profile.service';
import {ActivityService} from './activity.service';

const SERVICES = [
  ActivityService,
  LocalUserService,
  UsersService,
  ProfileService,
  AuthService,
  CookieService,
  StateService,
  SmartTableService,
  LayoutService,
];

@NgModule({
  imports: [
    CommonModule,
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
