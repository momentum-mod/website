import {Component, Input} from '@angular/core';
import { LocalUserService } from '../../../../@core/data/local-user.service';
import {User} from '../../../../@core/models/user.model';
import {Permission} from '../../../../@core/models/permissions.model';

@Component({
  selector: 'ngx-profile-card',
  styleUrls: ['./profile-card.component.scss'],
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
