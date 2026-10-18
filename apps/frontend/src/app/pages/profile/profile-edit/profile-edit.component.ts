import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MAX_BIO_LENGTH,
  UpdateUser,
  User,
  Ban,
  ISOCountryCode,
  Socials,
  SocialsData,
  NON_WHITESPACE_REGEXP
} from '@momentum/constants';
import { omit } from '@momentum/util-fn';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { Icon, IconComponent } from '../../../icons';
import { TitleService } from '../../../services/title.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { UsersService } from '../../../services/data/users.service';
import { AdminService } from '../../../services/data/admin.service';
import { EMPTY, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { CardComponent } from '../../../components/card/card.component';
import { Select } from 'primeng/select';
import { PluralPipe } from '../../../pipes/plural.pipe';
import { UnsortedKeyvaluePipe } from '../../../pipes/unsorted-keyvalue.pipe';
import { TooltipDirective } from '../../../directives/tooltip.directive';

@Component({
  selector: 'm-profile-edit',
  templateUrl: './profile-edit.component.html',
  imports: [
    SelectModule,
    ReactiveFormsModule,
    NgClass,
    CardComponent,
    Select,
    PluralPipe,
    UnsortedKeyvaluePipe,
    TooltipDirective,
    IconComponent
  ]
})
export class ProfileEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly localUserService = inject(LocalUserService);
  private readonly usersService = inject(UsersService);
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);
  private readonly nnfb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(TitleService);

  protected readonly AlphabeticalCountryCodes = Object.entries(ISOCountryCode)
    .sort(([_, a], [__, b]) => a.localeCompare(b))
    .map(([code, label]) => ({ code, label }));
  protected readonly Ban = Ban;
  protected readonly SocialsData = SocialsData as Readonly<
    Record<
      keyof Socials,
      { icon: Icon; regex: RegExp; example: string; url: string }
    >
  >;

  // Built up in ctor
  form: FormGroup;

  get alias() {
    return this.form.get('alias') as FormControl<string>;
  }
  get bio() {
    return this.form.get('bio') as FormControl<string>;
  }
  get country() {
    return this.form.get('country') as FormControl<string>;
  }
  get socials() {
    return this.form.get('socials') as FormGroup;
  }

  protected user: User | null = null;
  protected isLocal = false;
  protected isAdmin = false;
  protected isModOrAdmin = false;

  protected readonly MAX_BIO_LENGTH = MAX_BIO_LENGTH;

  constructor() {
    const socialsForm = {};
    for (const [name, { regex }] of Object.entries(SocialsData)) {
      socialsForm[name] = ['', [Validators.pattern(regex)]];
    }

    this.form = this.nnfb.group({
      alias: this.nnfb.control<string>('', {
        validators: [
          Validators.required,
          Validators.maxLength(32),
          Validators.pattern(NON_WHITESPACE_REGEXP)
        ]
      }),
      bio: this.nnfb.control<string>('', {
        validators: Validators.maxLength(MAX_BIO_LENGTH)
      }),
      country: this.nnfb.control<string>(''),
      socials: this.nnfb.group(socialsForm),
      resetAvatar: this.nnfb.control<boolean>(false)
    });
  }

  ngOnInit(): void {
    this.localUserService.user.subscribe(() => {
      this.isAdmin = this.localUserService.isAdmin;
      this.isModOrAdmin = this.localUserService.isModOrAdmin;
    });

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params: ParamMap) => {
          if (!this.localUserService.isLoggedIn) {
            this.router.navigateByUrl('/');
            return EMPTY;
          }

          const id = Number(params.get('id') ?? -1);
          if (params.has('id') && this.localUserService.user.value?.id !== id) {
            this.isLocal = false;
            return this.usersService.getUser(id, {
              expand: ['profile', 'userStats']
            });
          }

          this.isLocal = true;
          return this.localUserService.user;
        })
      )
      .subscribe((user) => this.setUser(user));
  }

  setUser(user: User) {
    this.user = user;
    if (!this.isLocal) {
      this.titleService.setTitle(`Editing ${user.alias}'s profile`);
    }
    // On DTO profile stuff in within `profile` sub-object - for form we don't
    // want that nesting.
    this.form.patchValue({ ...omit(user, 'profile'), ...user.profile });
    this.checkUserPermissions();
  }

  updateUser() {
    this.usersService
      .getUser(this.user.id, {
        expand: ['profile', 'userStats']
      })
      .subscribe((user) => this.setUser(user));
  }

  onSubmit(): void {
    if (!this.form.valid) return;

    const update: UpdateUser = this.form.value;

    // Don't include empty values on update input (they'd fail backend
    // validation!)
    for (const [k, v] of Object.entries(update.socials)) {
      if (v === '') delete update.socials[k];
    }

    // We log /admin queries separately so really worth using the /user endpoint
    // whenever possible. So only do the /admin call is it's got admin-specific
    // stuff on.
    if (this.isLocal) {
      this.localUserService.updateUser(update).subscribe({
        next: () => {
          this.localUserService.refreshLocalUser();
          this.messageService.add({
            severity: 'success',
            detail: 'Updated user profile!'
          });
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update user profile!',
            detail: httpError.error.message
          })
      });
    } else {
      this.adminService.updateUser(this.user.id, update).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            detail: 'Updated user profile!'
          });
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update user profile!',
            detail: httpError.error.message
          })
      });
    }
  }

  hasBan(ban: Ban) {
    return this.localUserService.hasBan(ban, this.user);
  }

  checkUserPermissions() {
    if (this.hasBan(Ban.ALIAS) && !this.isModOrAdmin) {
      this.alias.disable();
    } else {
      this.alias.enable();
    }
    if (this.hasBan(Ban.BIO) && !this.isModOrAdmin) {
      this.bio.disable();
    } else {
      this.bio.enable();
    }
  }

  returnToProfile() {
    this.router.navigate([`/profile/${this.user.id}`]);
  }

  resetAlias() {
    (this.isLocal
      ? this.localUserService.resetAliasToSteamAlias()
      : this.adminService.resetUserAliasToSteamAlias(this.user.id)
    ).subscribe({
      next: () => {
        if (this.isLocal) this.localUserService.refreshLocalUser();
        else this.updateUser();
        this.messageService.add({
          severity: 'success',
          detail: 'Successfully reset alias to Steam name!'
        });
      },
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to reset alias to Steam alias!',
          detail: httpError.error.message
        })
    });
  }

  resetAvatar() {
    (this.isLocal
      ? this.localUserService.updateAvatarFromSteam()
      : this.adminService.updateUserAvatarFromSteam(this.user.id)
    ).subscribe({
      next: () => {
        if (this.isLocal) this.localUserService.refreshLocalUser();
        this.messageService.add({
          severity: 'success',
          detail: 'Successfully updated avatar!'
        });
      },
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to update avatar!',
          detail: httpError.error.message
        })
    });
  }
}
