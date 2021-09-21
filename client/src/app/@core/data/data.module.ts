import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CookieService } from 'ngx-cookie-service';

import { LocalUserStoreService } from './local-user/local-user-store.service';
import { LocalUserService } from './local-user/local-user.service';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { StateService } from './state.service';
import { SmartTableService } from './smart-table.service';
import { LayoutService } from './layout.service';
import { ActivityStoreService } from './activity/activity-store.service';
import { ActivityService } from './activity/activity.service';
import { MapStoreService } from './maps/map-store.service';
import { MapsService } from './maps/maps.service';
import {TwitchAPIService} from './twitch-api.service';
import {TumblrAPIService} from './tumblr-api.service';

const SERVICES = [
  ActivityStoreService,ActivityService,
  LocalUserStoreService,LocalUserService,
  UsersService,
  MapStoreService,MapsService,
  AuthService,
  CookieService,
  StateService,
  SmartTableService,
  LayoutService,
  TwitchAPIService,
  TumblrAPIService,
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
  static forRoot(): ModuleWithProviders<DataModule> {
    return {
      ngModule: DataModule,
      providers: [
        ...SERVICES,
      ],
    };
  }
}
