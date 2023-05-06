import { Component } from '@angular/core';
import { LocalUserService } from '../../../@core/data/local-user.service';
import { User } from '../../../@core/models/user.model';

@Component({
  selector: 'mom-dashboard-home',
  styleUrls: ['./dashboard-home.component.scss'],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent {
  user: User;

  constructor(public locUsrService: LocalUserService) {
    this.locUsrService
      .getLocalUser({
        params: { expand: 'stats' }
      })
      .subscribe(
        (res) => {
          this.user = res;
        },
        (err) => {
          console.error(err);
        }
      );
  }
}
