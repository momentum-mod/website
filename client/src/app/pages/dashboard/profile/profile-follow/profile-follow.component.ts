import {Component, Input, OnInit} from '@angular/core';
import {ReplaySubject} from 'rxjs';
import {User} from '../../../../@core/models/user.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {NbDialogRef, NbDialogService, NbToastrService} from '@nebular/theme';
import {Activity_Type} from '../../../../@core/models/activity-type.model';
import {finalize} from 'rxjs/operators';
import {UserFollowObject} from '../../../../@core/models/follow.model';

@Component({
  selector: 'profile-notify-edit',
  template: `
    <nb-card>
      <nb-card-header>
        Edit Notification Settings
      </nb-card-header>
      <nb-card-body>
        Notify me when this user<br><br>
        <ul class="list-unstyled">
          <li>
            <nb-checkbox [(ngModel)]="checkboxFlags.PB.checked">
              achieves a personal best
            </nb-checkbox>
          </li>
          <li>
            <nb-checkbox [(ngModel)]="checkboxFlags.WR.checked">
              achieves a world record
            </nb-checkbox>
          </li>
          <li>
            <nb-checkbox [(ngModel)]="checkboxFlags.MAP_APPROVED.checked">
              gets a map approved
            </nb-checkbox>
          </li>
          <li>
            <nb-checkbox [(ngModel)]="checkboxFlags.MAP_UPLOADED.checked">
              uploads a map
            </nb-checkbox>
          </li>
        </ul>
      </nb-card-body>
      <nb-card-footer>
        <div class="row no-gutters">
          <div class="col-6 pr-1">
            <button class="btn btn-danger m-0 w-100" (click)="close()">Close</button>
          </div>
          <div class="col-6 pl-1">
            <button class="btn btn-primary m-0 w-100" (click)="submit()">Submit</button>
          </div>
        </div>
      </nb-card-footer>
    </nb-card>
  `,
  styles: [`
    button { margin: 1rem; }
    nb-card { min-width: 300px; }
  `],
})
export class ProfileNotifyEditComponent implements OnInit {
  @Input() flags: number;
  ActivityType: typeof Activity_Type = Activity_Type;
  checkboxFlags = {
    PB: {checked: false, value: Activity_Type.PB_ACHIEVED},
    WR: {checked: false, value: Activity_Type.WR_ACHIEVED},
    MAP_APPROVED: {checked: false, value: Activity_Type.MAP_APPROVED},
    MAP_UPLOADED: {checked: false, value: Activity_Type.MAP_UPLOADED},
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
  localFollowStatus: UserFollowObject; // The follow object of the local user following target user
  targetFollowStatus: UserFollowObject; // The follow object of the target user following local user
  checked: boolean;
  constructor(private localUserService: LocalUserService,
              private toastService: NbToastrService,
              private dialogService: NbDialogService) {
    this.user = null;
    this.checked = false;
    this.localFollowStatus = null;
    this.targetFollowStatus = null;
  }

  ngOnInit() {
    this.userSubj$.subscribe(usr => {
      this.user = usr;
      this.localUserService.checkFollowStatus(this.user)
        .pipe(finalize(() => this.checked = true))
        .subscribe(resp => {
          this.localFollowStatus = resp.local;
          this.targetFollowStatus = resp.target;
      }, err => {
          this.toastService.danger(err.message, 'Could not check follow status');
      });
    });
  }
  followClick() {
    if (!this.localFollowStatus) {
      this.localUserService.followUser(this.user).subscribe(resp => {
        this.localFollowStatus = resp;
      }, err => {
        this.toastService.danger(err.message, 'Could not follow user');
      });
    } else {
      this.localUserService.unfollowUser(this.user).subscribe(resp => {
        this.localFollowStatus = null;
      }, err => {
        this.toastService.danger(err.message, 'Could not unfollow user');
      });
    }
  }

  editNotificationSettings() {
    if (!this.localFollowStatus)
      return;
    this.dialogService.open(ProfileNotifyEditComponent, {
      context: {
        flags: this.localFollowStatus.notifyOn,
      },
    }).onClose.subscribe(resp => {
      if (resp) {
        this.localUserService.updateFollowStatus(this.user, resp.newFlags).subscribe(() => {
          this.localFollowStatus.notifyOn = resp.newFlags;
        }, err => {
          this.toastService.danger('Could not update follow status', err.message);
        });
      }
    });
  }

}
