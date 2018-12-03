import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../@core/data/local-user.service';
import {switchMap} from 'rxjs/operators';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {UsersService} from '../../../@core/data/users.service';
import {User} from '../../../@core/models/user.model';
import {ReplaySubject} from 'rxjs';
import {Permission} from '../../../@core/models/permissions.model';
import {ToasterService} from 'angular2-toaster';
import {UserFollowObject} from '../../../@core/models/follow.model';

@Component({
  selector: 'ngx-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  userSubj$: ReplaySubject<User>;
  user: User;
  isLocal: boolean;
  isMapper: boolean;
  isMod: boolean;
  isAdmin: boolean;
  avatar_url: string;
  avatar_loaded: boolean;
  followingUsers: UserFollowObject[];
  followedByUsers: UserFollowObject[];

  constructor(private route: ActivatedRoute,
              private router: Router,
              public userService: LocalUserService,
              private usersService: UsersService,
              private toastService: ToasterService) {
    this.isLocal = true;
    this.userSubj$ = new ReplaySubject<User>(1);
    this.isMapper = false;
    this.isMod = false;
    this.isAdmin = false;
    this.followingUsers = [];
    this.followedByUsers = [];
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        if (params.has('id')) {
          this.userService.getLocal().subscribe(usr => {
            this.isLocal = params.get('id') === usr.id;
          }, error => {
            this.toastService.popAsync('error', 'Cannot get user profile', error.message);
          });
          return this.usersService.getUser(params.get('id'), {
            params: { expand: 'profile,stats' },
          });
        } else {
          this.isLocal = true;
          return this.userService.getLocalUser({
            params: { expand: 'profile,stats' },
          });
        }
      },
      ),
    ).subscribe(usr => {
      this.user = usr;
      this.isMapper = (this.user.permissions & Permission.MAPPER) === Permission.MAPPER;
      this.isMod = (this.user.permissions & Permission.MODERATOR) === Permission.MODERATOR;
      this.isAdmin = (this.user.permissions & Permission.ADMIN) === Permission.ADMIN;
      this.userSubj$.next(usr);
      if (!this.hasPerm(Permission.BANNED_AVATAR)) {
        this.avatar_url = this.user.profile.avatarURL;
      }
      this.avatar_loaded = true;
      this.usersService.getUserFollows(this.user).subscribe(resp => {
        this.followingUsers = resp.followed;
      }, err => {
        this.toastService.popAsync('error', 'Could not retrieve user follows', err.message);
      });
      this.usersService.getFollowersOfUser(this.user).subscribe(resp => {
        this.followedByUsers = resp.followers;
      }, err => {
        this.toastService.popAsync('error', 'Could not retrieve user following', err.message);
      });
    }, error => {
      this.toastService.popAsync('error', 'Cannot get user details', error.message);
    });
  }

  hasPerm(perm) {
    if (!this.user)
      return false;
    return this.userService.hasPermission(perm, this.user);
  }

  onEditProfile() {
    // TODO: Make this open the edit dialog
    this.router.navigate(['/dashboard/profile/edit']);
  }

  canEdit(): boolean {
    return this.isLocal || this.userService.hasPermission(Permission.MODERATOR | Permission.ADMIN);
  }

  clickUser(user: User) {
    if (user)
      this.router.navigate(['/dashboard/profile/' + user.id]);
  }
}
