import {Component, Input, OnInit} from '@angular/core';
import {User} from '../../../../@core/models/user.model';
import {UsersService} from '../../../../@core/data/users.service';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';
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

  isFollowingUser: boolean;
  isNotifiedOfUser: boolean;

  constructor(private usersService: UsersService,
              private localUserService: LocalUserService,
              private toastService: ToasterService) {
    this.followingUsers = [];
    this.followedByUsers = [];
    this.user = null;
    this.isFollowingUser = false;
    this.isNotifiedOfUser = false;
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
      if (!this.isLocal) {
        this.localUserService.isFollowingUser(this.user).subscribe(resp => {
          this.isFollowingUser = true;
        }, err => {
          this.isFollowingUser = false;
        });
      }
    });
  }

  followClick() {
    this.localUserService.followUser(this.user).subscribe(resp => {
      this.isFollowingUser = true;
    }, err => {
        this.toastService.popAsync('error', 'Could not follow user', err.message);
    });
  }

  followNotifyClick() {
    this.localUserService.updateFollowStatus(this.user, !this.isNotifiedOfUser).subscribe(resp => {
      this.isNotifiedOfUser = !this.isNotifiedOfUser;
    });
  }
}
