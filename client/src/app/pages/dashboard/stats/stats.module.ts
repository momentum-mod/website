import {NgModule} from '@angular/core';
import {StatsComponent} from './stats.component';
import {StatsRoutingModule} from './stats-routing.module';
import { GlobalStatsComponent } from './global-stats/global-stats.component';
import {NotFoundModule} from '../../not-found/not-found.module';

@NgModule ({
  imports: [
    NotFoundModule,
    StatsRoutingModule],
  declarations: [StatsComponent, GlobalStatsComponent],
})
export class StatsModule {
}
