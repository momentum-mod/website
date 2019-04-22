import {Component, OnInit, ViewChild} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';
import 'style-loader!angular2-toaster/toaster.css';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AuthService} from '../../../../@core/data/auth.service';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {UsersService} from '../../../../@core/data/users.service';
import {switchMap} from 'rxjs/operators';
import {of} from 'rxjs';
import {Role} from '../../../../@core/models/role.model';
import {Ban} from '../../../../@core/models/ban.model';
import {User} from '../../../../@core/models/user.model';
import {AdminService} from '../../../../@core/data/admin.service';
import {ConfirmDialogComponent} from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';
import {NbDialogService} from '@nebular/theme';
import {NbTabComponent} from '@nebular/theme/components/tabset/tabset.component';

@Component({
  selector: 'profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  profileEditFormGroup: FormGroup = this.fb.group({
    'alias': [ '' , [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
    'profile': this.fb.group({
      'bio': ['', [Validators.maxLength(1000)]],
    }),
  });
  get alias() {
    return this.profileEditFormGroup.get('alias');
  }
  get bio() {
    return this.profileEditFormGroup.get('profile').get('bio');
  }
  adminEditFg: FormGroup = this.fb.group({
    'banAlias': [ false ],
    'banBio': [ false ],
    'banAvatar': [ false ],
    'banLeaderboards': [ false ],
    'verified': [ false ],
    'mapper': [ false ],
    'moderator': [ false ],
    'admin': [ false ],
  });

  user: User;
  mergeUser: User;
  mergeErr: string;
  isLocal: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  Role: typeof Role = Role;
  Ban: typeof Ban = Ban;

  @ViewChild('socials') socials: NbTabComponent;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private localUserService: LocalUserService,
              private usersService: UsersService,
              private adminService: AdminService,
              private authService: AuthService,
              private toasterService: ToasterService,
              private dialogService: NbDialogService,
              private fb: FormBuilder) {
    this.user = null;
    this.isLocal = true;
    this.isAdmin = false;
    this.mergeUser = null;
    this.mergeErr = null;
  }
  ngOnInit(): void {
    this.localUserService.getLocal().subscribe(locUsr => {
      this.isAdmin = this.localUserService.hasRole(Role.ADMIN, locUsr);
      this.isModerator = this.localUserService.hasRole(Role.MODERATOR, locUsr);
      this.route.paramMap.pipe(
        switchMap((params: ParamMap) => {
            if (params.has('id')) {
              const numID: number = Number(params.get('id'));
              this.isLocal = numID === locUsr.id;
              if (!this.isLocal) {
                return this.usersService.getUser(numID, {
                  params: { expand: 'profile' },
                });
              }
            }
            this.isLocal = true;
            return of(locUsr);
          },
        ),
      ).subscribe((usr: User) => {
        this.user = usr;
        this.profileEditFormGroup.patchValue(usr);
        this.checkUserPermissions();
      }, error => this.err('Cannot retrieve user details', error.message));
    });
  }

  err(title: string, msg?: string) {
    this.toasterService.popAsync('error', title, msg || '');
  }

  onSubmit(): void {
    if (this.isLocal && !this.isAdmin) {
      if (!this.profileEditFormGroup.valid)
        return;
      this.localUserService.updateUser(this.profileEditFormGroup.value).subscribe(() => {
        this.localUserService.refreshLocal();
        this.toasterService.popAsync('success', 'Updated user profile!', '');
      }, error => this.err('Failed to update user profile!', error.message));
    } else {
      const userUpdate: User = this.profileEditFormGroup.value;
      userUpdate.roles = this.user.roles;
      userUpdate.bans = this.user.bans;
      this.adminService.updateUser(this.user.id, userUpdate).subscribe(() => {
        if (this.isLocal)
          this.localUserService.refreshLocal();
        this.toasterService.popAsync('success', 'Updated user profile!', '');
      }, error => this.err('Failed to update user profile!', error.message));
    }
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

  toggleRole(role: Role) {
    if (this.hasRole(role)) {
      this.user.roles &= ~role;
    } else {
      this.user.roles |= role;
    }
    this.checkUserPermissions();
  }

  toggleBan(ban: Ban) {
    if (this.hasBan(ban)) {
      this.user.bans &= ~ban;
    } else {
      this.user.bans |= ban;
    }
    this.checkUserPermissions();
  }

  hasRole(role: Role) {
    return this.localUserService.hasRole(role, this.user);
  }

  hasBan(ban: Ban) {
    return this.localUserService.hasBan(ban, this.user);
  }

  checkUserPermissions() {
    const permStatus = {
      banAlias: this.hasBan(Ban.BANNED_ALIAS),
      banBio: this.hasBan(Ban.BANNED_BIO),
      banAvatar: this.hasBan(Ban.BANNED_AVATAR),
      banLeaderboards: this.hasBan(Ban.BANNED_LEADERBOARDS),
      verified: this.hasRole(Role.VERIFIED),
      mapper: this.hasRole(Role.MAPPER),
      moderator: this.hasRole(Role.MODERATOR),
      admin: this.hasRole(Role.ADMIN),
    };

    permStatus.banAlias && !(this.isAdmin || this.isModerator) ? this.alias.disable() : this.alias.enable();
    permStatus.banBio && !(this.isAdmin || this.isModerator) ? this.bio.disable() : this.bio.enable();

    this.adminEditFg.patchValue(permStatus);
  }

  returnToProfile() {
    this.router.navigate([`/dashboard/profile${this.isLocal ? '' : '/' + this.user.id}`]);
  }

  deleteUser() {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Delete user?',
        message: `You are about to delete this user!
        This will erase everything that the user has ever done!
        Are you sure you want to proceed?`,
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.adminService.deleteUser(this.user.id).subscribe(() => {
          this.toasterService.popAsync('success', 'Success', 'Successfully deleted user!');
          this.router.navigate(['/dashboard']);
        }, err => {
          this.toasterService.popAsync('error', 'Failed', 'Failed to delete user!');
        });
      }
    });
  }

  selectMergeUser(user1: User) {
    if (this.user.id === user1.id) {
      this.mergeErr = 'Cannot merge the same user onto themselves!';
      return;
    }
    this.mergeErr = null;
    this.mergeUser = user1;
  }

  mergeUsers() {
    if (!this.mergeUser)
      return;
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Merge users?',
        message: `You are about to merge the placeholder user ${this.user.alias} with the user ${this.mergeUser.alias}.
        This will merge over all activities, credits, and user follows, and then delete the placeholder user!
        Are you sure you want to proceed?`,
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.adminService.mergeUsers(this.user, this.mergeUser).subscribe(() => {
          this.toasterService.popAsync('success', 'Success', 'Successfully merged the two users!');
          this.router.navigate([`/dashboard/profile/${this.mergeUser.id}`]);
          this.mergeUser = null;
        }, err => {
          this.toasterService.popAsync('error', 'Failed', 'Failed to merge users!');
        });
      }
    });
  }

  cancelMerge() {
    this.mergeUser = null;
  }
}
