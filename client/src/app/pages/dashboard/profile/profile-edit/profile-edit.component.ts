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
import {Permission} from '../../../../@core/models/permissions.model';
import {User} from '../../../../@core/models/user.model';
import {AdminService} from '../../../../@core/data/admin.service';

@Component({
  selector: 'profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  profileEditFormGroup: FormGroup = this.fb.group({
    'alias': [ '' , [Validators.minLength(3), Validators.maxLength(32)]],
    'bio': ['', [Validators.maxLength(1000)]],
  });
  get alias() {
    return this.profileEditFormGroup.get('alias');
  }
  get bio() {
    return this.profileEditFormGroup.get('bio');
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
  permissions = Permission;
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
      this.isAdmin = this.localUserService.hasPermission(Permission.ADMIN, locUsr);
      this.isModerator = this.localUserService.hasPermission(Permission.MODERATOR, locUsr);
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
        this.profileEditFormGroup.patchValue(usr.profile);
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
      this.localUserService.updateProfile(this.profileEditFormGroup.value).subscribe(data => {
        this.localUserService.refreshLocal();
        this.toasterService.popAsync('success', 'Updated user profile!', '');
      }, error => this.err('Failed to update user profile!', error.message));
    } else {
      this.user.profile.alias = this.alias.value;
      this.user.profile.bio = this.bio.value;
      this.adminService.updateUser(this.user).subscribe(() => {
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

  togglePerm(perm: Permission) {
    if (this.hasPerm(perm)) {
      this.user.permissions &= ~perm;
    } else {
      this.user.permissions |= perm;
    }
    this.checkUserPermissions();
  }

  hasPerm(perm: Permission) {
    return this.localUserService.hasPermission(perm, this.user);
  }

  checkUserPermissions() {
    const permStatus = {
      banAlias: this.hasPerm(Permission.BANNED_ALIAS),
      banBio: this.hasPerm(Permission.BANNED_BIO),
      banAvatar: this.hasPerm(Permission.BANNED_AVATAR),
      verified: this.hasPerm(Permission.VERIFIED),
      mapper: this.hasPerm(Permission.MAPPER),
      moderator: this.hasPerm(Permission.MODERATOR),
      admin: this.hasPerm(Permission.ADMIN),
    };

    permStatus.banAlias && !(this.isAdmin || this.isModerator) ? this.alias.disable() : this.alias.enable();
    permStatus.banBio && !(this.isAdmin || this.isModerator) ? this.bio.disable() : this.bio.enable();

    this.adminEditFg.patchValue(permStatus);
  }

  returnToProfile() {
    this.router.navigate([`/dashboard/profile${this.isLocal ? '' : '/' + this.user.id}`]);
  }
}
