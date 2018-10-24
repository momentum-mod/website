import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {BodyOutputType, Toast, ToasterConfig, ToasterService} from 'angular2-toaster';

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
  });

  @Output() onEditSuccess: EventEmitter<any> = new EventEmitter();

  toasterConfig: ToasterConfig;
  constructor(private localUserService: LocalUserService,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
    this.toasterConfig = new ToasterConfig({
      positionClass: 'toast-top-full-width',
      timeout: 5000,
      newestOnTop: true,
      tapToDismiss: true,
      preventDuplicates: true,
      animation: 'fade', // 'fade', 'flyLeft', 'flyRight', 'slideDown', 'slideUp'
      limit: 5,
    });
  }
  ngOnInit(): void {
    this.localUserService.getLocal().subscribe(usr => {
      this.profileEditFormGroup.patchValue(usr.profile);
    });
  }

  onSubmit(): void {
    this.localUserService.updateProfile(this.profileEditFormGroup.value).subscribe(data => {
      // console.log('Response: ' + data);
      this.onEditSuccess.emit(this.profileEditFormGroup.value);
      this.localUserService.refreshLocal();
      // TODO: redirect to user profile?
      this.showToast('success', 'Updated user profile!', '');
    }, error => {
      this.showToast('error', 'Failed to update user profile!', error.message);
    });
  }

  showToast(type: string, title: string, body: string) {
    // types: ['default', 'info', 'success', 'warning', 'error']
    const toast: Toast = {
      type: type,
      title: title,
      body: body,
      timeout: 5000,
      showCloseButton: true,
      bodyOutputType: BodyOutputType.TrustedHtml,
    };

    this.toasterService.popAsync(toast);
  }
}
