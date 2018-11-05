import {Component, Input, OnInit} from '@angular/core';
import {ReplaySubject} from 'rxjs';
import {User} from '../../../../../@core/models/user.model';
import {LocalUserService} from '../../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';
import {NbDialogRef, NbDialogService} from '@nebular/theme';
import {Activity_Type} from '../../../../../@core/models/activity-type.model';

@Component({
  selector: 'profile-notify-edit',
  template: `
    <nb-card>
      <nb-card-header>
        Edit Notification Permissions
      </nb-card-header>
      <nb-card-body>
        <nb-checkbox [(ngModel)]="checkboxFlags.PB.checked">
          {{ActivityType[ActivityType.PB_ACHIEVED]}}
        </nb-checkbox>
        <nb-checkbox [(ngModel)]="checkboxFlags.WR.checked">
          {{ActivityType[ActivityType.WR_ACHIEVED]}}
        </nb-checkbox>
        <nb-checkbox [(ngModel)]="checkboxFlags.MAP_SUBMIT.checked">
          {{ActivityType[ActivityType.MAP_UPLOADED]}}
        </nb-checkbox>
      </nb-card-body>
      <nb-card-footer>
        <button class="btn btn-danger" (click)="close()">Close</button>
        <button class="btn btn-primary" (click)="submit()">Submit</button>
      </nb-card-footer>
    </nb-card>
  `,
  styles: [`button { margin: 1rem; }`],
})
export class ProfileNotifyEditComponent implements OnInit {
  @Input() flags: number;
  ActivityType = Activity_Type;
  checkboxFlags = {
    PB: {checked: false, value: Activity_Type.PB_ACHIEVED},
    WR: {checked: false, value: Activity_Type.WR_ACHIEVED},
    MAP_SUBMIT: {checked: false, value: Activity_Type.MAP_UPLOADED},
    // TODO add more
  };
  constructor(protected dialogRef: NbDialogRef<ProfileNotifyEditComponent>) {
  }

  ngOnInit() {
    for (const perm in this.checkboxFlags) {
      if ((1 << this.checkboxFlags[perm].value) & this.flags) {
        this.checkboxFlags[perm].checked = true;
      }
    }
  }

  close() {
    this.dialogRef.close();
  }
  submit() {
    for (const perm in this.checkboxFlags) {
      if (this.checkboxFlags[perm].checked) {
        this.flags |= (1 << this.checkboxFlags[perm].value);
      } else
        this.flags &= ~(1 << this.checkboxFlags[perm].value);
    }
    this.dialogRef.close({newFlags: this.flags});
  }
}

@Component({
  selector: 'profile-follow',
  templateUrl: './profile-follow.component.html',
  styleUrls: ['./profile-follow.component.scss'],
})
export class ProfileFollowComponent implements OnInit {

  @Input('userSubj') userSubj$: ReplaySubject<User>;
  user: User;
  isFollowingUser: boolean;
  notifiesOnEvents: number; // Flag of notifications
  constructor(private localUserService: LocalUserService,
              private toastService: ToasterService,
              private dialogService: NbDialogService) {
    this.user = null;
    this.notifiesOnEvents = 0;
  }

  ngOnInit() {
    this.userSubj$.subscribe(usr => {
      this.user = usr;
      this.localUserService.isFollowingUser(this.user).subscribe(resp => {
        this.isFollowingUser = true;
        this.notifiesOnEvents = resp.notifyOn;
      }, err => {
        this.isFollowingUser = false;
      });
    });
  }
  followClick() {
    if (!this.isFollowingUser) {
      this.localUserService.followUser(this.user).subscribe(resp => {
        this.isFollowingUser = true;
      }, err => {
        this.toastService.popAsync('error', 'Could not follow user', err.message);
      });
    } else {
      this.localUserService.unfollowUser(this.user).subscribe(resp => {
        this.isFollowingUser = false;
      });
    }
  }

  editNotificationSettings() {
    this.dialogService.open(ProfileNotifyEditComponent, {
      context: {
        flags: this.notifiesOnEvents,
      },
    }).onClose.subscribe(resp => {
      if (resp) {
        this.localUserService.updateFollowStatus(this.user, resp.newFlags).subscribe(() => {
          this.notifiesOnEvents = resp.newFlags;
        });
      }
    });
  }

}
