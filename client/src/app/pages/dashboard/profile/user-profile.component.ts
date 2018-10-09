import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../@core/data/user.service';


@Component({
  selector: 'ngx-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {

  flipped = false;

  user: any;

  constructor(public userService: UserService) {}

  ngOnInit() {
    this.user = this.userService.getInfo();
  }

  toggleView() {
    this.flipped = !this.flipped;
  }
}
