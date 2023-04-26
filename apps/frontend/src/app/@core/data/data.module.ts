import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CookieService } from 'ngx-cookie-service';

import { LocalUserService } from './local-user.service';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { StateService } from './state.service';
import { SmartTableService } from './smart-table.service';
import { LayoutService } from './layout.service';
import { ActivityService } from './activity.service';
import { MapsService } from './maps.service';
import { TwitchAPIService } from './twitch-api.service';
import { TumblrAPIService } from './tumblr-api.service';

const SERVICES = [
  ActivityService,
  LocalUserService,
  UsersService,
  MapsService,
  AuthService,
  CookieService,
  StateService,
  SmartTableService,
  LayoutService,
  TwitchAPIService,
  TumblrAPIService
];

@NgModule({
  imports: [CommonModule],
  providers: [...SERVICES]
})
export class DataModule {
  static forRoot(): ModuleWithProviders<DataModule> {
    return {
      ngModule: DataModule,
      providers: [...SERVICES]
    };
  }
}
