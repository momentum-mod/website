import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Role, User } from '@momentum/constants';
import { of } from 'rxjs';
import { PaginatorModule } from 'primeng/paginator';
import { RoleBadgesComponent } from '../role-badges/role-badges.component';
import { AbstractSearchComponent } from './abstract-search.component';

import { UsersService } from '../../services/data/users.service';
import { LocalUserService } from '../../services/data/local-user.service';
import { IconComponent } from '../../icons';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { SpinnerComponent } from '../spinner/spinner.component';
import { Popover } from 'primeng/popover';

@Component({
  selector: 'm-user-search',
  templateUrl: './user-search.component.html',
  imports: [
    PaginatorModule,

    RoleBadgesComponent,
    IconComponent,
    SpinnerDirective,
    ReactiveFormsModule,
    RouterLink,
    NgClass,
    TooltipDirective,
    SpinnerComponent,
    Popover
  ]
})
export class UserSearchComponent
  extends AbstractSearchComponent<User>
  implements OnInit
{
  constructor(
    private readonly usersService: UsersService,
    private readonly localUserService: LocalUserService
  ) {
    super();
  }

  protected readonly Role = Role;
  public itemsName = 'users';
  protected searchBySteam = false;

  /**
   * Show a button for opening the user profile in a separate tab. Used when a
   * component wants to select a user, not view this profile (e.g. credits
   * picker)
   */
  @Input() showProfileButton = false;
  @Input() useOverlay = true;

  @ViewChild('searchMain') mainEl: ElementRef;
  @ViewChild('searchOverlay') overlay: Popover;

  searchRequest(searchString: string) {
    if (this.searchBySteam) {
      if (Number.isNaN(+searchString)) {
        this.search.setErrors({ error: 'Input is not a Steam ID!' });
        return of(null);
      }
      return this.usersService.getUsers({ steamID: searchString });
    } else
      return this.usersService.getUsers({
        search: searchString,
        take: this.rows,
        skip: this.first
      });
  }

  hasRole(role: Role, user: User) {
    return this.localUserService.hasRole(role, user);
  }

  override ngOnInit() {
    if (this.useOverlay) {
      this.search.valueChanges.subscribe((value) =>
        value?.length > 0
          ? this.overlay.show(null, this.mainEl.nativeElement)
          : this.overlay.hide()
      );
    }

    super.ngOnInit();
  }
}
