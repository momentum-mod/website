import {Component, Input} from '@angular/core';
import {User} from '../../../../@core/models/user.model';

@Component({
  selector: 'profile-info',
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.scss'],
})
export class ProfileInfoComponent {

  @Input('user') user: User;

  constructor() {}
}
