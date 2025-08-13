import {
  Component,
  ElementRef,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
  inject
} from '@angular/core';
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
import { CommonModule, NgClass } from '@angular/common';
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
    Popover,
    CommonModule
  ]
})
export class UserSearchComponent
  extends AbstractSearchComponent<User>
  implements OnInit
{
  private readonly usersService = inject(UsersService);
  private readonly localUserService = inject(LocalUserService);

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

  /**
   * If set, will be put after default no results/error message,
   * and paginator if results found.
   */
  @Input() appendTemplate?: TemplateRef<any>;

  @ViewChild('searchMain') mainEl: ElementRef;
  @ViewChild('searchOverlay') overlay: Popover;

  searchRequest(searchString: string) {
    if (this.searchBySteam) {
      if (
        Number.isNaN(+searchString) ||
        BigInt(searchString.toString()) >= BigInt(2 ** 63)
      ) {
        this.search.setErrors({ error: 'Input is not a Steam64 ID!' });
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
