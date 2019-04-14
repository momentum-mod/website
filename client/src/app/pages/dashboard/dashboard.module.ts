import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgxEchartsModule} from 'ngx-echarts';

import {ThemeModule} from '../../@theme/theme.module';
import {DashboardComponent} from './dashboard.component';

import {DashboardRoutingModule} from './dashboard-routing.module';
import {DashboardHomeComponent} from './home/dashboard-home.component';
import {NotFoundModule} from '../not-found/not-found.module';
import {ToasterModule} from 'angular2-toaster';
import {MarkdownModule} from 'ngx-markdown';
import {NbAccordionModule, NbDialogModule} from '@nebular/theme';
import {HomeStatsComponent} from './home/home-stats/home-stats.component';
import {HomeUserMapsComponent} from './home/home-user-maps/home-user-maps.component';
import {HomeUserLibraryComponent} from './home/home-user-library/home-user-library.component';
import {NgxPaginationModule} from 'ngx-pagination';
import {RunInfoComponent} from './runs/run-info/run-info.component';

@NgModule({
  imports: [
    ThemeModule,
    NbAccordionModule,
    NgxEchartsModule,
    NbDialogModule.forChild(),
    ToasterModule.forChild(),
    MarkdownModule.forChild(),
    FormsModule,
    NotFoundModule,
    NgxPaginationModule,
    DashboardRoutingModule,
  ],
  declarations: [
    DashboardComponent,
    DashboardHomeComponent,
    HomeStatsComponent,
    HomeUserMapsComponent,
    HomeUserLibraryComponent,
    RunInfoComponent,
  ],
  providers: [],
})
export class DashboardModule { }
