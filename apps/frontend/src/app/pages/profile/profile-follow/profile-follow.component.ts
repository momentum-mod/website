import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Follow, User } from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { SharedModule } from '../../../shared.module';
import { ProfileNotifyEditComponent } from './profile-notify-edit/profile-notify-edit.component';
import { LocalUserService } from '../../../services/data/local-user.service';

@Component({
  selector: 'm-profile-follow',
  templateUrl: './profile-follow.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class ProfileFollowComponent implements OnInit {
  @Input() userSubject: BehaviorSubject<User>;
  user: User;
  localFollowStatus: Follow; // The follow object of the local user following target user
  targetFollowStatus: Follow; // The follow object of the target user following local user
  checked = false;

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService,
    private readonly dialogService: DialogService
  ) {}

  ngOnInit() {
    this.userSubject.subscribe((usr) => {
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
            this.messageService.add({
              severity: 'error',
              summary: 'Could not check follow status',
              detail: error.message
            })
        });
    });
  }

  followClick() {
    if (!this.localFollowStatus) {
      this.localUserService.followUser(this.user).subscribe({
        next: (response) => (this.localFollowStatus = response),
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Could not follow user',
            detail: error.message
          })
      });
    } else {
      this.localUserService.unfollowUser(this.user).subscribe({
        next: () => (this.localFollowStatus = null),
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Could not unfollow user',
            detail: error.message
          })
      });
    }
  }

  editNotificationSettings() {
    if (!this.localFollowStatus) return;
    this.dialogService
      .open(ProfileNotifyEditComponent, {
        header: 'Edit Notification Settings',
        data: { flags: this.localFollowStatus.notifyOn }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        this.localUserService
          .updateFollowStatus(this.user, response.newFlags)
          .subscribe({
            next: () => (this.localFollowStatus.notifyOn = response.newFlags),
            error: (error) =>
              this.messageService.add({
                severity: 'error',
                detail: error.message,
                summary: 'Could not update follow status'
              })
          });
      });
  }
}
