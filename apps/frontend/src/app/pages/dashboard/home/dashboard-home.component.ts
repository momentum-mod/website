import { Component } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { User } from '@momentum/constants';

@Component({
  selector: 'mom-dashboard-home',
  styleUrls: ['./dashboard-home.component.scss'],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent {
  user: User;

  constructor(public localUserService: LocalUserService) {
    this.localUserService.getLocalUser({ expand: ['userStats'] }).subscribe({
      next: (response) => (this.user = response),
      error: (error) => console.error(error)
    });
  }
}
