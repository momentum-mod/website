import { Component, OnInit } from '@angular/core';
import { UserService, Permission } from '../../../../@core/data/user.service';

@Component({
  selector: 'ngx-profile-card',
  styleUrls: ['./profile-card.scss'],
  templateUrl: './profile-card.component.html',
})
export class ProfileCardComponent implements OnInit {

  user: any;
  permission = Permission;

  constructor(public userService: UserService) {}

  ngOnInit() {
    this.user = this.userService.getInfo();
  }
  hasPerm(perm) {
    return this.userService.hasPermission(perm);
  }
}
