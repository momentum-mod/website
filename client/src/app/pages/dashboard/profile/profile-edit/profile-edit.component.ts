import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ProfileService, UserProfile} from '../../../../@core/data/profile.service';

@Component({
  selector: 'profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  model: UserProfile;
  @Output() onEditSuccess: EventEmitter<any> = new EventEmitter();

  constructor(private profileService: ProfileService) {

  }
  ngOnInit(): void {
    this.profileService.getLocalProfile().subscribe(data => {
        this.model = data;
    });
  }

  onSubmit(): void {
    this.profileService.updateUserProfile(this.model).subscribe(data => {
      this.onEditSuccess.emit(this.model);
    }, error => {
      alert(error.message); // TODO: replace with toaster!!! :)
    });
  }
}
