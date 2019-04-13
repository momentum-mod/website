import {Component, OnInit} from '@angular/core';
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
  isLocal: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  Role: typeof Role = Role;
  Ban: typeof Ban = Ban;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private localUserService: LocalUserService,
              private usersService: UsersService,
              private adminService: AdminService,
              private authService: AuthService,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
    this.user = null;
    this.isLocal = true;
    this.isAdmin = false;
  }
  ngOnInit(): void {
    this.localUserService.getLocal().subscribe(locUsr => {
      this.isAdmin = this.localUserService.hasRole(Role.ADMIN, locUsr);
      this.isModerator = this.localUserService.hasRole(Role.MODERATOR, locUsr);
      this.route.paramMap.pipe(
        switchMap((params: ParamMap) => {
            if (params.has('id')) {
              this.isLocal = params.get('id') === locUsr.id;
              if (!this.isLocal) {
                return this.usersService.getUser(params.get('id'), {
                  params: { expand: 'profile' },
                });
              }
            }
            this.isLocal = true;
            return of(locUsr);
          },
        ),
      ).subscribe(usr => {
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
}
