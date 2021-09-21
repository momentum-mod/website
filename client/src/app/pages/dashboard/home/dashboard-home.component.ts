import {Component} from '@angular/core';
import { map } from 'rxjs/operators';
import {LocalUserStoreService} from '../../../@core/data/local-user/local-user-store.service';
import {User} from '../../../@core/models/user.model';

@Component({
  selector: 'dashboard-home',
  styleUrls: ['./dashboard-home.component.scss'],
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent {

  user: User;

  constructor(public locUsrService: LocalUserStoreService) {
    this.locUsrService.getLocalUser({
      params: { expand: 'stats' },
    });
    this.locUsrService.localUser$.pipe(
      map(c => {
        if(c) {
          this.user = c;
        }
      }),
    ).subscribe(() => {},
    err => {
      console.error(err);
    });
  }
}
