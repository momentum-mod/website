import {Component, Input} from '@angular/core';
import {UserProfile} from '../../../../@core/data/profile.service';

@Component({
  selector: 'profile-info',
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.scss'],
})
export class ProfileInfoComponent {

  @Input('userProfile') userProfile: UserProfile;

  constructor() {}
}
