import { NgModule } from '@angular/core';
import { StatsComponent } from './stats.component';
import { StatsRoutingModule } from './stats-routing.module';
import { SharedModule } from '../../../shared.module';

@NgModule({
  imports: [SharedModule, StatsRoutingModule],
  declarations: [StatsComponent]
})
export class StatsModule {}
