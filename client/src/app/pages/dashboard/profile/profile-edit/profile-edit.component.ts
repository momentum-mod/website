import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';
import 'style-loader!angular2-toaster/toaster.css';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {UserProfile} from '../../../../@core/models/profile.model';
import {AuthService} from '../../../../@core/data/auth.service';

@Component({
  selector: 'profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  profileEditFormGroup: FormGroup = this.fb.group({
    'alias': [ '' , [Validators.required, Validators.minLength(3), Validators.maxLength(24)]],
    'bio': ['', [Validators.required, Validators.maxLength(500)]],
  });

  @Output() onEditSuccess: EventEmitter<any> = new EventEmitter();
  profile: UserProfile;
  constructor(private localUserService: LocalUserService,
              private authService: AuthService,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
    this.profile = null;
  }
  ngOnInit(): void {
    this.localUserService.getLocal().subscribe(usr => {
      this.profile = usr.profile;
      this.profileEditFormGroup.patchValue(usr.profile);
    }, error => {
      this.toasterService.popAsync('error', 'Cannot retrieve user details', error.message);
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

  onAuthWindowClose(): void {
    this.localUserService.refreshLocal();
  }

  auth(platform: string) {
    const childWnd = window.open(`/auth/${platform}?jwt=` + localStorage.getItem('accessToken'), 'myWindow',
      'width=500,height=500');
    const timer = setInterval(() => {
      if (childWnd.closed) {
        this.onAuthWindowClose();
        clearInterval(timer);
      }
    }, 500);
  }
  unAuth(platform: string) {
    this.authService.removeSocialAuth(platform).subscribe(resp => {
      this.localUserService.refreshLocal();
    }, err => {
      this.toasterService.popAsync('error', `Failed to unauthorize ${platform} account`, err.message);
    });
  }
}
