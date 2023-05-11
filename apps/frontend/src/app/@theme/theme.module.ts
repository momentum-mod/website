import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  NbActionsModule,
  NbButtonModule,
  NbCardModule,
  NbCheckboxModule,
  NbContextMenuModule,
  NbIconModule,
  NbInputModule,
  NbLayoutModule,
  NbListModule,
  NbMenuModule,
  NbPopoverModule,
  NbProgressBarModule,
  NbRadioModule,
  NbRouteTabsetModule,
  NbSelectModule,
  NbSidebarModule,
  NbTabsetModule,
  NbThemeModule,
  NbUserModule
} from '@nebular/theme';

import {
  ActivityCardComponent,
  ActivityContentComponent,
  HeaderComponent,
  NotificationComponent,
  SearchInputComponent
} from './components';

import { NbSearchModule } from './components/search/search.module';
import { RouterModule } from '@angular/router';
import { ActivityListComponent } from './components/activity/activity-list/activity-list.component';
import { ReportButtonComponent } from './components/report/report-button/report-button.component';
import { CreateReportDialogComponent } from './components/report/create-report-dialog/create-report-dialog.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { TimeagoModule } from 'ngx-timeago';
import { NgxAdminDashboardComponent } from './layouts/dashboard/dashboard.layout';
import { FrontendDirectivesModule } from '@momentum/frontend/directives';
import { PipesModule } from '@momentum/frontend/pipes';

const BASE_MODULES = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  RouterModule,
  FrontendDirectivesModule,
  NgOptimizedImage,
  PipesModule
];

const NB_MODULES = [
  NbIconModule,
  NbCardModule,
  NbLayoutModule,
  NbTabsetModule,
  NbRouteTabsetModule,
  NbMenuModule,
  NbUserModule,
  NbListModule,
  NbActionsModule,
  NbSearchModule,
  NbSidebarModule,
  NbCheckboxModule,
  NbRadioModule,
  NbPopoverModule,
  NbContextMenuModule,
  NbProgressBarModule,
  NbButtonModule,
  NbSelectModule,
  NbInputModule
];

const COMPONENTS = [
  NgxAdminDashboardComponent,
  HeaderComponent,
  SearchInputComponent,
  NotificationComponent,
  ActivityCardComponent,
  ActivityContentComponent,
  ActivityListComponent,
  ReportButtonComponent,
  CreateReportDialogComponent,
  ConfirmDialogComponent
];

const NB_THEME_PROVIDERS = [
  ...NbThemeModule.forRoot({ name: 'mom' }, [{ name: 'mom', base: 'dark' }])
    .providers,
  ...NbSidebarModule.forRoot().providers,
  ...NbMenuModule.forRoot().providers
];

@NgModule({
  imports: [...BASE_MODULES, ...NB_MODULES, TimeagoModule],
  exports: [...BASE_MODULES, ...NB_MODULES, ...COMPONENTS, TimeagoModule],
  declarations: [...COMPONENTS]
})
export class ThemeModule {
  static forRoot(): ModuleWithProviders<ThemeModule> {
    return {
      ngModule: ThemeModule,
      providers: [...NB_THEME_PROVIDERS]
    };
  }
}
