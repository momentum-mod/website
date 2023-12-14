import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bitfield, Role, RoleNames } from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';

/**
 * List of icons for each role on a Role bitfield in a simple flexbox layout.
 *
 * Has no nested divs, so CSS properties supplied in the outer template should
 * work well, e.g. `height` and `gap`.
 */
@Component({
  selector: 'm-role-badges',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  template: `@for (role of heldRoleStrings; track $index) {
    <!-- SVGs in apps/frontend/src/assets/images/badges/roles must have
         filenames corresponding to RoleNames! -->
    <img
      [src]="'assets/images/badges/' + role + '.svg'"
      [mTooltip]="role"
      [alt]="role + ' Badge'"
      class="h-full aspect-square"
    />
  }`,
  styles: ':host { display: flex; }'
})
export class RoleBadgesComponent implements OnChanges {
  @Input({ required: true }) roles!: Bitfield<Role>;
  @Input() ignored: Role[];
  private readonly available: Role[] = [
    Role.ADMIN,
    Role.MODERATOR,
    Role.VERIFIED,
    Role.MAPPER,
    Role.PORTER,
    Role.REVIEWER,
    Role.PLACEHOLDER,
    Role.DELETED
  ];

  protected heldRoleStrings: string[] = [];

  ngOnChanges() {
    this.heldRoleStrings = this.available
      .filter(
        (role) =>
          Bitflags.has(this.roles, role) && !this.ignored?.includes(role)
      )
      .map((role) => RoleNames.get(role));
  }
}
