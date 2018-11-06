import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '../../../@core/data/local-user.service';
import {switchMap} from 'rxjs/operators';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {UsersService} from '../../../@core/data/users.service';
import {User} from '../../../@core/models/user.model';
import {ReplaySubject} from 'rxjs';
import {Permission} from '../../../@core/models/permissions.model';

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

  constructor(private route: ActivatedRoute,
              public userService: LocalUserService,
              private usersService: UsersService) {
    this.isLocal = true;
    this.userSubj$ = new ReplaySubject<User>(1);
    this.isMapper = false;
    this.isMod = false;
    this.isAdmin = false;
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        if (params.has('id')) {
          this.userService.getLocal().subscribe(usr => {
            this.isLocal = params.get('id') === usr.id;
          });
          return this.usersService.getUser(params.get('id'));
        } else {
          this.isLocal = true;
          return this.userService.getLocal();
        }
      },
      ),
    ).subscribe(usr => {
      this.user = usr;
      this.isMapper = (this.user.permissions & Permission.MAPPER) === Permission.MAPPER;
      this.isMod = (this.user.permissions & Permission.MODERATOR) === Permission.MODERATOR;
      this.isAdmin = (this.user.permissions & Permission.ADMIN) === Permission.ADMIN;
      this.userSubj$.next(usr);
    });
  }
}
