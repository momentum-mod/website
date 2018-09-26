import { Component } from '@angular/core';
import { UserService } from '../../../@core/data/user.service';

@Component({
  selector: 'ngx-profile-card',
  styleUrls: ['./profile-card.scss'],
  templateUrl: './profile-card.component.html',
})
export class ProfileCardComponent {

  flipped = false;

  user: any;

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.user = this.userService.getInfo();
  }

  toggleView() {
    this.flipped = !this.flipped;
  }
}
