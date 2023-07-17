import { Component, Input, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { finalize } from 'rxjs/operators';
import { ProfileNotifyEditComponent } from './profile-notify-edit/profile-notify-edit.component';
import { Follow, User } from '@momentum/constants';
import { LocalUserService } from '@momentum/frontend/data';

@Component({
  selector: 'mom-profile-follow',
  templateUrl: './profile-follow.component.html',
  styleUrls: ['./profile-follow.component.scss']
})
export class ProfileFollowComponent implements OnInit {
  @Input() userSubj: ReplaySubject<User>;
  user: User;
  localFollowStatus: Follow; // The follow object of the local user following target user
  targetFollowStatus: Follow; // The follow object of the target user following local user
  checked: boolean;

  constructor(
    private localUserService: LocalUserService,
    private toastService: NbToastrService,
    private dialogService: NbDialogService
  ) {
    this.user = null;
    this.checked = false;
    this.localFollowStatus = null;
    this.targetFollowStatus = null;
  }

  ngOnInit() {
    this.userSubj.subscribe((usr) => {
      this.user = usr;
      this.localUserService
        .checkFollowStatus(this.user)
        .pipe(finalize(() => (this.checked = true)))
        .subscribe({
          next: (response) => {
            this.localFollowStatus = response.local;
            this.targetFollowStatus = response.target;
          },
          error: (error) =>
            this.toastService.danger(
              error.message,
              'Could not check follow status'
            )
        });
    });
  }

  followClick() {
    if (!this.localFollowStatus) {
      this.localUserService.followUser(this.user).subscribe({
        next: (response) => (this.localFollowStatus = response),
        error: (error) =>
          this.toastService.danger(error.message, 'Could not follow user')
      });
    } else {
      this.localUserService.unfollowUser(this.user).subscribe({
        next: () => (this.localFollowStatus = null),
        error: (error) =>
          this.toastService.danger(error.message, 'Could not unfollow user')
      });
    }
  }

  editNotificationSettings() {
    if (!this.localFollowStatus) return;
    this.dialogService
      .open(ProfileNotifyEditComponent, {
        context: { flags: this.localFollowStatus.notifyOn }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        this.localUserService
          .updateFollowStatus(this.user, response.newFlags)
          .subscribe({
            next: () => (this.localFollowStatus.notifyOn = response.newFlags),
            error: (error) =>
              this.toastService.danger(
                'Could not update follow status',
                error.message
              )
          });
      });
  }
}
