import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '../../../@core/data/local-user.service';
import {switchMap} from 'rxjs/operators';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {UsersService} from '../../../@core/data/users.service';
import {User} from '../../../@core/models/user.model';


@Component({
  selector: 'ngx-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  user: User;

  constructor(private route: ActivatedRoute,
              public userService: LocalUserService,
              private usersService: UsersService) {
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        params.has('id') ?
          this.usersService.getUser(params.get('id')) :
          this.userService.getLocal(),
      ),
    ).subscribe(usr => this.user = usr);
  }
}
