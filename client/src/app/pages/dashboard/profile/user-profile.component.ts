import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '../../../@core/data/local-user.service';
import {switchMap} from 'rxjs/operators';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {UsersService} from '../../../@core/data/users.service';
import {User} from '../../../@core/models/user.model';
import {ReplaySubject} from 'rxjs';


@Component({
  selector: 'ngx-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  user: ReplaySubject<User>;
  isLocal: boolean;

  constructor(private route: ActivatedRoute,
              public userService: LocalUserService,
              private usersService: UsersService) {
    this.isLocal = true;
    this.user = new ReplaySubject<User>(1);
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
    ).subscribe(usr => this.user.next(usr));
  }
}
