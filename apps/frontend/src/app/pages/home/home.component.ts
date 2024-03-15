import { Component } from '@angular/core';
import { User } from '@momentum/constants';
import { HomeUserMapsComponent } from './user-maps/home-user-maps.component';
import { HomeStatsComponent } from './stats/home-stats.component';
import { ActivityComponent } from '../../components/activity/activity.component';
import { LocalUserService } from '../../services/data/local-user.service';

@Component({
  selector: 'm-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [HomeStatsComponent, HomeUserMapsComponent, ActivityComponent]
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
