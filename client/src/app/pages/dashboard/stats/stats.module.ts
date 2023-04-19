import { NgModule } from '@angular/core';
import { StatsComponent } from './stats.component';
import { StatsRoutingModule } from './stats-routing.module';
import { GlobalStatsComponent } from './global-stats/global-stats.component';
import { NotFoundModule } from '../../not-found/not-found.module';
import { ThemeModule } from '../../../@theme/theme.module';
import { GlobalStatsBaseComponent } from './global-stats/global-stats-base/global-stats-base.component';
import { GlobalStatsMapsComponent } from './global-stats/global-stats-maps/global-stats-maps.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { GlobalStatsTopsComponent } from './global-stats/global-stats-tops/global-stats-tops.component';
import { GlobalStatsFilterComponent } from './global-stats/global-stats-filter/global-stats-filter.component';
import { NbSelectModule } from '@nebular/theme';

@NgModule({
  imports: [
    ThemeModule,
    NbSelectModule,
    NgxEchartsModule,
    NotFoundModule,
    StatsRoutingModule
  ],
  declarations: [
    StatsComponent,
    GlobalStatsComponent,
    GlobalStatsBaseComponent,
    GlobalStatsMapsComponent,
    GlobalStatsTopsComponent,
    GlobalStatsFilterComponent
  ]
})
export class StatsModule {}
