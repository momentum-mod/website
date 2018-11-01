import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';

import 'style-loader!angular2-toaster/toaster.css';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  profileEditFormGroup: FormGroup = this.fb.group({
    'alias': ['', [Validators.required, Validators.minLength(3)]],
    'bio': ['', Validators.maxLength(1000)],
    'twitterName': ['', Validators.maxLength(32)],
    'discordName': [''],
    'youtubeName': [''],
    'twitchName': [''],
  });

  @Output() onEditSuccess: EventEmitter<any> = new EventEmitter();

  constructor(private localUserService: LocalUserService,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
  }
  ngOnInit(): void {
    this.localUserService.getLocal().subscribe(usr => {
      this.profileEditFormGroup.patchValue(usr.profile);
    });
  }

  onSubmit(): void {
    this.localUserService.updateProfile(this.profileEditFormGroup.value).subscribe(data => {
      this.onEditSuccess.emit(this.profileEditFormGroup.value);
      this.localUserService.refreshLocal();
      this.toasterService.popAsync('success', 'Updated user profile!', '');
    }, error => {
      this.toasterService.popAsync('error', 'Failed to update user profile!', error.message);
    });
  }
}
