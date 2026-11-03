import {
  Component,
  ElementRef,
  OnInit,
  TemplateRef,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { Role, User } from '@momentum/constants';
import { of } from 'rxjs';
import { PaginatorModule } from '@openng/optimus-ui/paginator';
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
import { PopoverComponent } from '../popover/popover.component';

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
    CommonModule,
    PopoverComponent
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
  protected readonly searchBySteam = signal(false);
  protected readonly selectedIdx = signal(0);
  protected readonly anchorName = `--userSearch-${Math.random().toString(36).substring(2, 12)}`;

  /**
   * Show a button for opening the user profile in a separate tab. Used when a
   * component wants to select a user, not view this profile (e.g. credits
   * picker)
   */
  readonly showProfileButton = input(false);
  readonly useOverlay = input(true);

  /**
   * If set, will be put after default no results/error message,
   * and paginator if results found.
   */
  readonly appendTemplate = input<TemplateRef<any>>();

  readonly addPlaceholder = output<void>();

  readonly mainEl = viewChild<ElementRef>('searchMain');
  readonly overlay = viewChild<PopoverComponent>('searchOverlay');

  searchRequest(searchString: string) {
    this.selectedIdx.set(0);
    if (this.searchBySteam()) {
      if (
        Number.isNaN(+searchString) ||
        BigInt(searchString.toString()) >= BigInt(2 ** 63)
      ) {
        this.search.setErrors({ error: 'Input is not a Steam64 ID!' });
        return of(null);
      }
      return this.usersService.getUsers({ steamID: searchString });
    } else {
      return this.usersService.getUsers({
        search: searchString,
        take: this.rows,
        skip: this.first()
      });
    }
  }

  hasRole(role: Role, user: User) {
    return this.localUserService.hasRole(role, user);
  }

  onKeydown(event: KeyboardEvent) {
    const found = this.found();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIdx.update((idx) => (idx + 1) % found.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIdx.update((idx) => (idx - 1 + found.length) % found.length);
    } else if (event.key === 'Enter') {
      if (
        this.search.value.length > 0 &&
        found.length === 0 &&
        this.appendTemplate() &&
        this.addPlaceholder
      ) {
        this.addPlaceholder.emit();
      } else {
        this.onSelected(found[this.selectedIdx()]);
      }
    }
  }

  override ngOnInit() {
    if (this.useOverlay()) {
      this.search.valueChanges.subscribe((value) =>
        value?.length > 0 ? this.overlay().show() : this.overlay().hide()
      );
    }

    super.ngOnInit();
  }
}
