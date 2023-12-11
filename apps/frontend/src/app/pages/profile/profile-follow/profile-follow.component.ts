import { Component, Input, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { NbDialogService } from '@nebular/theme';
import { finalize } from 'rxjs/operators';
import { ProfileNotifyEditComponent } from './profile-notify-edit/profile-notify-edit.component';
import { Follow, User } from '@momentum/constants';
import { LocalUserService } from '@momentum/frontend/data';
import { SharedModule } from '../../../shared.module';
import { TooltipDirective } from '../../../directives/tooltip/tooltip.directive';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-profile-follow',
  templateUrl: './profile-follow.component.html',
  standalone: true,
  imports: [SharedModule, TooltipDirective]
})
export class ProfileFollowComponent implements OnInit {
  @Input() userSubj: ReplaySubject<User>;
  user: User;
  localFollowStatus: Follow; // The follow object of the local user following target user
  targetFollowStatus: Follow; // The follow object of the target user following local user
  checked: boolean;

  constructor(
    private localUserService: LocalUserService,
    private messageService: MessageService,
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
        context: { flags: this.localFollowStatus.notifyOn }
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
