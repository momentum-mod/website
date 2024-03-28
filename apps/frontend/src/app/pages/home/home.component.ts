import { Component } from '@angular/core';
import { User } from '@momentum/constants';
import { HomeUserMapsComponent } from './user-maps/home-user-maps.component';
import { HomeStatsComponent } from './stats/home-stats.component';
import { ActivityComponent } from '../../components/activity/activity.component';
import { LocalUserService } from '../../services/data/local-user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'm-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [HomeStatsComponent, HomeUserMapsComponent, ActivityComponent]
})
export class HomeComponent {
  user: User;

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly router: Router
  ) {
    this.localUserService.user.subscribe({
      next: (user) => {
        if (user == null) {
          // Dashboard page doesn't make sense from non-logged-in-users yet,
          // so for now just redirect to the map browser.
          this.router.navigate(['/maps']);
        } else {
          this.user = user;
        }
      },
      error: (error) => console.error(error)
    });
  }
}
