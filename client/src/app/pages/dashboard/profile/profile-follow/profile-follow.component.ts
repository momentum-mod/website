import { Component, Input, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { User } from '../../../../@core/models/user.model';
import { LocalUserService } from '../../../../@core/data/local-user.service';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { finalize } from 'rxjs/operators';
import { UserFollowObject } from '../../../../@core/models/follow.model';
import { ProfileNotifyEditComponent } from './profile-notify-edit/profile-notify-edit.component';

@Component({
  selector: 'profile-follow',
  templateUrl: './profile-follow.component.html',
  styleUrls: ['./profile-follow.component.scss']
})
export class ProfileFollowComponent implements OnInit {
  @Input('userSubj') userSubj$: ReplaySubject<User>;
  user: User;
  localFollowStatus: UserFollowObject; // The follow object of the local user following target user
  targetFollowStatus: UserFollowObject; // The follow object of the target user following local user
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
    this.userSubj$.subscribe((usr) => {
      this.user = usr;
      this.localUserService
        .checkFollowStatus(this.user)
        .pipe(finalize(() => (this.checked = true)))
        .subscribe(
          (resp) => {
            this.localFollowStatus = resp.local;
            this.targetFollowStatus = resp.target;
          },
          (err) => {
            this.toastService.danger(
              err.message,
              'Could not check follow status'
            );
          }
        );
    });
  }
  followClick() {
    if (!this.localFollowStatus) {
      this.localUserService.followUser(this.user).subscribe(
        (resp) => {
          this.localFollowStatus = resp;
        },
        (err) => {
          this.toastService.danger(err.message, 'Could not follow user');
        }
      );
    } else {
      this.localUserService.unfollowUser(this.user).subscribe(
        (resp) => {
          this.localFollowStatus = null;
        },
        (err) => {
          this.toastService.danger(err.message, 'Could not unfollow user');
        }
      );
    }
  }

  editNotificationSettings() {
    if (!this.localFollowStatus) return;
    this.dialogService
      .open(ProfileNotifyEditComponent, {
        context: {
          flags: this.localFollowStatus.notifyOn
        }
      })
      .onClose.subscribe((resp) => {
        if (resp) {
          this.localUserService
            .updateFollowStatus(this.user, resp.newFlags)
            .subscribe(
              () => {
                this.localFollowStatus.notifyOn = resp.newFlags;
              },
              (err) => {
                this.toastService.danger(
                  'Could not update follow status',
                  err.message
                );
              }
            );
        }
      });
  }
}
