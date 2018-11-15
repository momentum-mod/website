import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';
import 'style-loader!angular2-toaster/toaster.css';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
// import {AuthService} from '../../../../@core/data/auth.service';

@Component({
  selector: 'profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  profileEditFormGroup: FormGroup = this.fb.group({
    'alias': ['', [Validators.required, Validators.minLength(3)]],
    'bio': ['', Validators.maxLength(1000)],
  });

  @Output() onEditSuccess: EventEmitter<any> = new EventEmitter();

  constructor(private localUserService: LocalUserService,
              private toasterService: ToasterService,
              private fb: FormBuilder,
              /*private authService: AuthService*/) {
  }
  ngOnInit(): void {
    this.localUserService.getLocal().subscribe(usr => {
      this.profileEditFormGroup.patchValue(usr.profile);
    });
/*    window.addEventListener('message', (e) => {
      console.log(e.origin);
      if (e.data.type) {
        this.authService.createAuth(e.data.type, e.data.auth).subscribe(res => {
          console.log(res);
        }, err => {
          this.toasterService.popAsync('error', 'Cannot authorize twitter', err.message);
        });
      }
    }, false);*/
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

  twitterAuth() {
    window.open('/auth/twitter?jwt=' + localStorage.getItem('accessToken'), 'myWindow', 'width=500,height=500');
  }
}
