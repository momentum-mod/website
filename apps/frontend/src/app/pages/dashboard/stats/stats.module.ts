import { NgModule } from '@angular/core';
import { StatsComponent } from './stats.component';
import { StatsRoutingModule } from './stats-routing.module';
import { NotFoundModule } from '../../not-found/not-found.module';
import { ThemeModule } from '../../../@theme/theme.module';
import { NgxEchartsModule } from 'ngx-echarts';
import { NbSelectModule } from '@nebular/theme';

@NgModule({
  imports: [
    ThemeModule,
    NbSelectModule,
    NgxEchartsModule,
    NotFoundModule,
    StatsRoutingModule
  ],
  declarations: [StatsComponent]
})
export class StatsModule {}
