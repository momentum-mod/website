import {Component, Input} from '@angular/core';
import { LocalUserService, Permission } from '../../../../@core/data/local-user.service';
import {User} from '../../../../@core/data/users.service';

@Component({
  selector: 'ngx-profile-card',
  styleUrls: ['./profile-card.scss'],
  templateUrl: './profile-card.component.html',
})
export class ProfileCardComponent {

  @Input('user') user: User;
  permission = Permission;

  constructor(public userService: LocalUserService) {}

  hasPerm(perm) {
    return this.userService.hasPermission(perm, this.user);
  }
}
