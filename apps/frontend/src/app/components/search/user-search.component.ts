import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Role, User } from '@momentum/constants';
import { of } from 'rxjs';
import { NgClass, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../icons';
import { LocalUserService, UsersService } from '../../services';
import { TooltipDirective, SpinnerDirective } from '../../directives';
import { RoleBadgesComponent } from '../role-badges/role-badges.component';
import { AbstractSearchComponent } from './abstract-search.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'm-user-search',
  templateUrl: './user-search.component.html',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
    NgClass,
    PaginatorModule,
    OverlayPanelModule,
    NgOptimizedImage,
    RouterLink,
    TooltipDirective,
    RoleBadgesComponent,
    SpinnerDirective,
    SpinnerComponent,
    NgTemplateOutlet
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
  @ViewChild('searchOverlay') overlay: OverlayPanel;

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
