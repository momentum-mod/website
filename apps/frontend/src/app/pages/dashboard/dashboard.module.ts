import { NgModule } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardHomeComponent } from './home/dashboard-home.component';
import { HomeStatsComponent } from './home/home-stats/home-stats.component';
import { HomeUserMapsComponent } from './home/home-user-maps/home-user-maps.component';
import { HomeUserLibraryComponent } from './home/home-user-library/home-user-library.component';
import { RunInfoComponent } from './runs/run-info/run-info.component';
import { SharedModule } from '../../shared.module';

@NgModule({
  imports: [SharedModule, DashboardRoutingModule],
  declarations: [
    DashboardComponent,
    DashboardHomeComponent,
    HomeStatsComponent,
    HomeUserMapsComponent,
    HomeUserLibraryComponent,
    RunInfoComponent
  ],
  providers: []
})
export class DashboardModule {}
