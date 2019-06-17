import {ModuleWithProviders, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {
  NbActionsModule,
  NbButtonModule,
  NbCardModule,
  NbCheckboxModule,
  NbContextMenuModule,
  NbIconModule,
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
  NbUserModule,
} from '@nebular/theme';

import {
  ActivityCardComponent,
  ActivityContentComponent,
  FooterComponent,
  HeaderComponent,
  NotificationComponent,
  SearchInputComponent,
} from './components';
import {CapitalizePipe, NumberThousandsPipe, NumberWithCommasPipe, PluralPipe, RoundPipe, TimingPipe} from './pipes';
import {SampleLayoutComponent} from './layouts';
import {NbSearchModule} from './components/search/search.module';
import {TimeAgoPipe} from 'time-ago-pipe';
import {RouterModule} from '@angular/router';
import {ActivityListComponent} from './components/activity/activity-list/activity-list.component';
import {ReportButtonComponent} from './components/report/report-button/report-button.component';
import {CreateReportDialogComponent} from './components/report/create-report-dialog/create-report-dialog.component';
import {ConfirmDialogComponent} from './components/confirm-dialog/confirm-dialog.component';
import {NbEvaIconsModule} from '@nebular/eva-icons';


const BASE_MODULES = [CommonModule, FormsModule, ReactiveFormsModule, RouterModule];

const NB_MODULES = [
  NbEvaIconsModule,
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
];

const COMPONENTS = [
  HeaderComponent,
  FooterComponent,
  SearchInputComponent,
  SampleLayoutComponent,
  NotificationComponent,
  ActivityCardComponent,
  ActivityContentComponent,
  ActivityListComponent,
  ReportButtonComponent,
  CreateReportDialogComponent,
  ConfirmDialogComponent,
];

const PIPES = [
  CapitalizePipe,
  PluralPipe,
  RoundPipe,
  TimingPipe,
  NumberWithCommasPipe,
  TimeAgoPipe,
  NumberThousandsPipe,
];

const NB_THEME_PROVIDERS = [
  ...NbThemeModule.forRoot(
    {
      name: 'mom',
    },
    [ { name: 'mom', base: 'dark'} ],
  ).providers,
  ...NbSidebarModule.forRoot().providers,
  ...NbMenuModule.forRoot().providers,
];

const ENTRY_COMPONENTS = [
  CreateReportDialogComponent,
  ConfirmDialogComponent,
];

@NgModule({
  imports: [...BASE_MODULES, ...NB_MODULES],
  exports: [...BASE_MODULES, ...NB_MODULES, ...COMPONENTS, ...PIPES],
  declarations: [...COMPONENTS, ...PIPES],
  entryComponents: [...ENTRY_COMPONENTS],
})
export class ThemeModule {
  static forRoot(): ModuleWithProviders {
    return <ModuleWithProviders>{
      ngModule: ThemeModule,
      providers: [...NB_THEME_PROVIDERS],
    };
  }
}
