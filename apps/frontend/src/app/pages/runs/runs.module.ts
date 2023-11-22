import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { RunInfoComponent } from './run-info/run-info.component';
import { RunsRoutingModule } from './runs-routing.module';

@NgModule({
  imports: [SharedModule, RunsRoutingModule, RunInfoComponent]
})
export class RunsModule {}
