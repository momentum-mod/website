import {Component, Input, OnInit} from '@angular/core';
import {User} from '../../../../@core/models/user.model';
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

  constructor() {
    this.user = null;
  }

  ngOnInit() {
    this.userSubj.subscribe(usr => {
      this.user = usr;
    });
  }
}
