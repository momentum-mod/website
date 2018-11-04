import {Component, Input, OnInit} from '@angular/core';
import {User} from '../../../../@core/models/user.model';
import {UsersService} from '../../../../@core/data/users.service';
import {ReplaySubject} from 'rxjs';

@Component({
  selector: 'profile-info',
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.scss'],
})
export class ProfileInfoComponent implements OnInit {

  @Input('userSubj') userSubj: ReplaySubject<User>;
  @Input('local') isLocal: boolean;
  user: User;
  followingUsers: User[];
  followedByUsers: User[];

  constructor(private usersService: UsersService) {
    this.followingUsers = [];
    this.followedByUsers = [];
    this.user = null;
  }

  ngOnInit() {
    this.userSubj.subscribe(usr => {
      this.user = usr;
      this.usersService.getUserFollows(this.user).subscribe(resp => {
        this.followingUsers = resp.followed;
      });
      this.usersService.getFollowersOfUser(this.user).subscribe(resp => {
        this.followedByUsers = resp.followers;
      });
    });
  }
}
