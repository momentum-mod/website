import { Component } from '@angular/core';
import { User } from '@momentum/constants';
import { LocalUserService } from '../../services';
import { ActivityComponent } from '../../components';
import { HomeUserLibraryComponent } from './user-library/home-user-library.component';
import { HomeUserMapsComponent } from './user-maps/home-user-maps.component';
import { HomeStatsComponent } from './stats/home-stats.component';

@Component({
  selector: 'm-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [
    HomeStatsComponent,
    HomeUserMapsComponent,
    HomeUserLibraryComponent,
    ActivityComponent
  ]
})
export class HomeComponent {
  user: User;

  constructor(private readonly localUserService: LocalUserService) {
    this.localUserService.localUserSubject.subscribe({
      next: (response) => (this.user = response),
      error: (error) => console.error(error)
    });
  }
}
