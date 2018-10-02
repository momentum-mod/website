import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CookieService } from 'ngx-cookie-service';
import { JwtModule } from '@auth0/angular-jwt';

import { UserService } from './user.service';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { ElectricityService } from './electricity.service';
import { StateService } from './state.service';
import { SmartTableService } from './smart-table.service';
import { PlayerService } from './player.service';
import { UserActivityService } from './user-activity.service';
import { OrdersChartService } from './orders-chart.service';
import { ProfitChartService } from './profit-chart.service';
import { TrafficListService } from './traffic-list.service';
import { PeriodsService } from './periods.service';
import { EarningService } from './earning.service';
import { OrdersProfitChartService } from './orders-profit-chart.service';
import { TrafficBarService } from './traffic-bar.service';
import { ProfitBarAnimationChartService } from './profit-bar-animation-chart.service';
import { LayoutService } from './layout.service';

const SERVICES = [
  UserService,
  UsersService,
  AuthService,
  JwtModule,
  CookieService,
  ElectricityService,
  StateService,
  SmartTableService,
  PlayerService,
  UserActivityService,
  OrdersChartService,
  ProfitChartService,
  TrafficListService,
  PeriodsService,
  EarningService,
  OrdersProfitChartService,
  TrafficBarService,
  ProfitBarAnimationChartService,
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
