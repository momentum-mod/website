import { Component } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { User } from '@momentum/constants';
import { ActivityCardComponent } from '../../components/activity/activity-card/activity-card.component';
import { HomeUserLibraryComponent } from './user-library/home-user-library.component';
import { HomeUserMapsComponent } from './user-maps/home-user-maps.component';
import { HomeStatsComponent } from './stats/home-stats.component';

@Component({
  selector: 'mom-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [
    HomeStatsComponent,
    HomeUserMapsComponent,
    HomeUserLibraryComponent,
    ActivityCardComponent
  ]
})
export class HomeComponent {
  user: User;

  constructor(public localUserService: LocalUserService) {
    this.localUserService.getLocalUser({ expand: ['userStats'] }).subscribe({
      next: (response) => (this.user = response),
      error: (error) => console.error(error)
    });
  }
}
