import {ModuleWithProviders, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import {
  NbActionsModule, NbButtonModule,
  NbCardModule,
  NbCheckboxModule,
  NbContextMenuModule,
  NbLayoutModule,
  NbListModule,
  NbMenuModule,
  NbPopoverModule,
  NbProgressBarModule,
  NbRouteTabsetModule, NbSelectModule,
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
import {
  CapitalizePipe, NumberThousandsPipe,
  NumberTrimPipe,
  NumberWithCommasPipe,
  PluralPipe,
  RoundPipe,
  TimingPipe,
} from './pipes';
import {
  SampleLayoutComponent,
} from './layouts';
import {NbSearchModule} from './components/search/search.module';
import {TimeAgoPipe} from 'time-ago-pipe';
import {RouterModule} from '@angular/router';
import {ActivityListComponent} from './components/activity/activity-list/activity-list.component';

const BASE_MODULES = [CommonModule, FormsModule, ReactiveFormsModule, RouterModule];

const NB_MODULES = [
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
  NbPopoverModule,
  NbContextMenuModule,
  NgbModule,
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
];

const PIPES = [
  CapitalizePipe,
  PluralPipe,
  RoundPipe,
  TimingPipe,
  NumberWithCommasPipe,
  TimeAgoPipe,
  NumberTrimPipe,
  NumberThousandsPipe,
];

const NB_THEME_PROVIDERS = [
  ...NbThemeModule.forRoot(
    {
      name: 'dark',
    },
    [ { name: 'dark', base: 'cosmic'} ],
  ).providers,
  ...NbSidebarModule.forRoot().providers,
  ...NbMenuModule.forRoot().providers,
];

@NgModule({
  imports: [...BASE_MODULES, ...NB_MODULES],
  exports: [...BASE_MODULES, ...NB_MODULES, ...COMPONENTS, ...PIPES],
  declarations: [...COMPONENTS, ...PIPES],
})
export class ThemeModule {
  static forRoot(): ModuleWithProviders {
    return <ModuleWithProviders>{
      ngModule: ThemeModule,
      providers: [...NB_THEME_PROVIDERS],
    };
  }
}
