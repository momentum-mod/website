import { Component } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { User } from '@momentum/constants';

@Component({
  selector: 'mom-home',
  templateUrl: './home.component.html'
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
