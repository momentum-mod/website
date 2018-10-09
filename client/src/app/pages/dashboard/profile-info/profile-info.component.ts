import { Component, OnInit } from '@angular/core';
import { UserService, Permission } from '../../../@core/data/user.service';

@Component({
  selector: 'profile-info',
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.scss'],
})
export class ProfileInfoComponent implements OnInit {

  user: any;
  permission = Permission;

  constructor(public userService: UserService) { }

  ngOnInit() {
    this.user = this.userService.getInfo();
  }

}
