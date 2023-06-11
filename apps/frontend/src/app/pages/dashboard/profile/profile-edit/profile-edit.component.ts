import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../components/confirm-dialog/confirm-dialog.component';
import {
  NbDialogService,
  NbTabComponent,
  NbToastrService
} from '@nebular/theme';
import { env } from '@momentum/frontend/env';
import { User } from '@momentum/types';
import {
  AdminService,
  AuthService,
  LocalUserService,
  UsersService
} from '@momentum/frontend/data';
import { Ban, Role } from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';

@Component({
  selector: 'mom-profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  private ngUnSub = new Subject<void>();

  profileEditFormGroup: FormGroup = this.fb.group({
    alias: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(32)]
    ],
    bio: ['', [Validators.maxLength(1000)]]
  });
  get alias() {
    return this.profileEditFormGroup.get('alias');
  }
  get bio() {
    return this.profileEditFormGroup.get('bio');
  }
  adminEditFg: FormGroup = this.fb.group({
    banAlias: [false],
    banBio: [false],
    banAvatar: [false],
    banLeaderboards: [false],
    verified: [false],
    mapper: [false],
    moderator: [false],
    admin: [false]
  });

  // TODO: Removing types on this for now, add back once socials auth is done!
  user: any; // User;
  mergeUser: User;
  mergeErr: string;
  isLocal: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  // TODO
  protected readonly Role = Role;
  protected readonly Ban = Ban;

  @ViewChild('socials', { static: false }) socials: NbTabComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localUserService: LocalUserService,
    private usersService: UsersService,
    private adminService: AdminService,
    private authService: AuthService,
    private toasterService: NbToastrService,
    private dialogService: NbDialogService,
    private fb: FormBuilder
  ) {
    this.user = null;
    this.isLocal = true;
    this.isAdmin = false;
    this.mergeUser = null;
    this.mergeErr = null;
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) => {
          return of(params.get('id'));
        })
      )
      .subscribe((id: string) => {
        if (id) {
          const numID = Number(id);
          this.isLocal = numID === this.localUserService.localUser.id;
          if (!this.isLocal) {
            this.usersService
              .getUser(numID, { expand: ['profile'] })
              .subscribe((usr) => this.setUser(usr));
          }
        }
        this.localUserService
          .getLocal()
          .pipe(takeUntil(this.ngUnSub))
          .subscribe((usr) => {
            this.isAdmin = this.localUserService.hasRole(Role.ADMIN, usr);
            this.isModerator = this.localUserService.hasRole(
              Role.MODERATOR,
              usr
            );
            if (this.isLocal) this.setUser(usr);
          });
      });
  }

  setUser(user: User) {
    this.user = user;
    this.profileEditFormGroup.patchValue(user);
    this.checkUserPermissions();
  }

  err(title: string, msg?: string) {
    this.toasterService.danger(msg || '', title);
  }

  onSubmit(): void {
    if (this.isLocal && !this.isAdmin) {
      if (!this.profileEditFormGroup.valid) return;
      this.localUserService
        .updateUser(this.profileEditFormGroup.value)
        .subscribe({
          next: () => {
            this.localUserService.refreshLocal();
            this.toasterService.success('Updated user profile!', 'Success');
          },
          error: (error) =>
            this.err('Failed to update user profile!', error.message)
        });
    } else {
      const userUpdate: User = this.profileEditFormGroup.value;
      userUpdate.roles = this.user.roles;
      userUpdate.bans = this.user.bans;
      this.adminService.updateUser(this.user.id, userUpdate).subscribe({
        next: () => {
          if (this.isLocal) this.localUserService.refreshLocal();
          this.toasterService.success('Updated user profile!', 'Success');
        },
        error: (error) =>
          this.err('Failed to update user profile!', error.message)
      });
    }
  }

  onAuthWindowClose(): void {
    this.localUserService.refreshLocal();
  }

  auth(platform: string) {
    const childWnd = window.open(
      env.auth + `/auth/${platform}?jwt=` + localStorage.getItem('accessToken'),
      'myWindow',
      'width=500,height=500'
    );
    const timer = setInterval(() => {
      if (childWnd.closed) {
        this.onAuthWindowClose();
        clearInterval(timer);
      }
    }, 500);
  }

  unAuth(platform: string) {
    this.authService.removeSocialAuth(platform).subscribe({
      next: () => this.localUserService.refreshLocal(),
      error: (error) =>
        this.toasterService.danger(
          error.message,
          `Failed to unauthorize ${platform} account`
        )
    });
  }

  toggleRole(role: Role) {
    this.user.roles = this.hasRole(role)
      ? Bitflags.remove(this.user.roles, role)
      : Bitflags.add(this.user.roles, role);
    this.checkUserPermissions();
  }

  toggleBan(ban: Ban) {
    this.user.bans = this.hasBan(ban)
      ? Bitflags.remove(this.user.bans, ban)
      : Bitflags.add(this.user.bans, ban);
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
      banAlias: this.hasBan(Ban.ALIAS),
      banBio: this.hasBan(Ban.BIO),
      banAvatar: this.hasBan(Ban.AVATAR),
      banLeaderboards: this.hasBan(Ban.LEADERBOARDS),
      verified: this.hasRole(Role.VERIFIED),
      mapper: this.hasRole(Role.MAPPER),
      moderator: this.hasRole(Role.MODERATOR),
      admin: this.hasRole(Role.ADMIN)
    };

    permStatus.banAlias && !(this.isAdmin || this.isModerator)
      ? this.alias.disable()
      : this.alias.enable();
    permStatus.banBio && !(this.isAdmin || this.isModerator)
      ? this.bio.disable()
      : this.bio.enable();

    this.adminEditFg.patchValue(permStatus);
  }

  returnToProfile() {
    this.router.navigate([
      `/dashboard/profile${this.isLocal ? '' : '/' + this.user.id}`
    ]);
  }

  deleteUser() {
    this.dialogService
      .open(ConfirmDialogComponent, {
        context: {
          title: 'Delete user?',
          message: `You are about to delete this user!
        This will erase everything that the user has ever done!
        Are you sure you want to proceed?`
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        this.adminService.deleteUser(this.user.id).subscribe({
          next: () => {
            this.toasterService.success('Successfully deleted user!');
            this.router.navigate(['/dashboard']);
          },
          error: () => this.toasterService.danger('Failed to delete user!')
        });
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
    if (!this.mergeUser) return;
    this.dialogService
      .open(ConfirmDialogComponent, {
        context: {
          title: 'Merge users?',
          message: `You are about to merge the placeholder user ${this.user.alias} with the user ${this.mergeUser.alias}.
        This will merge over all activities, credits, and user follows, and then delete the placeholder user!
        Are you sure you want to proceed?`
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        this.adminService.mergeUsers(this.user, this.mergeUser).subscribe({
          next: () => {
            this.toasterService.success('Successfully merged the two users!');
            this.router.navigate([`/dashboard/profile/${this.mergeUser.id}`]);
            this.mergeUser = null;
          },
          error: () => this.toasterService.danger('Failed to merge users!')
        });
      });
  }

  cancelMerge() {
    this.mergeUser = null;
  }

  resetAlias() {
    this.localUserService.resetAliasToSteamAlias().subscribe({
      next: () => {
        this.localUserService.refreshLocal();
        this.toasterService.success(
          'Successfully reset alias to Steam name!',
          'Success'
        );
      },
      error: () =>
        this.toasterService.danger(
          'Failed to reset alias to Steam alias!',
          'Failed'
        )
    });
  }

  ngOnDestroy(): void {
    this.ngUnSub.next();
    this.ngUnSub.complete();
  }
}
