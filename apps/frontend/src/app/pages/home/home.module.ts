import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { HomeComponent } from './home.component';
import { HomeUserLibraryComponent } from './user-library/home-user-library.component';
import { HomeStatsComponent } from './stats/home-stats.component';
import { HomeUserMapsComponent } from './user-maps/home-user-maps.component';

@NgModule({
  imports: [SharedModule],
  declarations: [
    HomeComponent,
    HomeUserLibraryComponent,
    HomeStatsComponent,
    HomeUserMapsComponent
  ]
})
export class HomeModule {}
