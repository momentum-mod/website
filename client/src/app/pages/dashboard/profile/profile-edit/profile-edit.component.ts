import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ProfileService, UserProfile} from '../../../../@core/data/profile.service';
import {LocalUserService} from '../../../../@core/data/local-user.service';

@Component({
  selector: 'profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  model: UserProfile;
  @Output() onEditSuccess: EventEmitter<any> = new EventEmitter();

  constructor(private profileService: ProfileService,
              private localUserService: LocalUserService) {

  }
  ngOnInit(): void {
    this.localUserService.getLocal().subscribe(usr => {
      this.model = usr.profile;
    });
  }

  onSubmit(): void {
    this.profileService.updateUserProfile(this.model).subscribe(data => {
      this.onEditSuccess.emit(this.model);
      this.localUserService.refreshLocal();
      // TODO: redirect or toast (or both?)
    }, error => {
      alert(error.message); // TODO: replace with toaster!!! :)
    });
  }
}
