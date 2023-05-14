import { Component } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { User } from '@momentum/types';

@Component({
  selector: 'mom-dashboard-home',
  styleUrls: ['./dashboard-home.component.scss'],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent {
  user: User;

  constructor(public locUsrService: LocalUserService) {
    this.locUsrService.getLocalUser({ params: { expand: 'stats' } }).subscribe({
      next: (response) => (this.user = response),
      error: (error) => console.error(error)
    });
  }
}
