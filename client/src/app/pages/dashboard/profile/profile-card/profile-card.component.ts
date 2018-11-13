import {Component, Input, OnInit} from '@angular/core';
import { LocalUserService } from '../../../../@core/data/local-user.service';
import {User} from '../../../../@core/models/user.model';
import {Permission} from '../../../../@core/models/permissions.model';
import {ReplaySubject} from 'rxjs';

@Component({
  selector: 'ngx-profile-card',
  styleUrls: ['./profile-card.component.scss'],
  templateUrl: './profile-card.component.html',
})
export class ProfileCardComponent implements OnInit {

  @Input('userSubj') userSubj: ReplaySubject<User>;
  user: User;
  permission = Permission;
  avatar_url: string;
  avatar_loaded: boolean;

  constructor(public userService: LocalUserService) {
    this.user = null;
    this.avatar_url = 'assets/images/blank_avatar.jpg';
    this.avatar_loaded = false;
  }

  ngOnInit() {
    this.userSubj.subscribe(usr => {
      this.user = usr;
      if (!this.hasPerm(Permission.BANNED_AVATAR)) {
        this.avatar_url = this.user.profile.avatarURL;
      }
      this.avatar_loaded = true;
    });
  }
  hasPerm(perm) {
    if (!this.user)
      return false;
    return this.userService.hasPermission(perm, this.user);
  }
}
