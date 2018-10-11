import {Component} from '@angular/core';
import {LocalUserService} from '../../../@core/data/local-user.service';

@Component({
  selector: 'dashboard-home',
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent {
  constructor(public locUsrService: LocalUserService) {
  }
}
