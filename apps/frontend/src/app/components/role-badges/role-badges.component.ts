import { Component, Input, OnChanges } from '@angular/core';
import { Flags, Role, RoleNames } from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import { TooltipDirective } from '../../directives/tooltip.directive';

/**
 * List of icons for each role in a simple flexbox layout.
 *
 * Has no nested divs, so CSS properties supplied in the outer template should
 * work well, e.g. `height` and `gap`.
 */
@Component({
  selector: 'm-role-badges',
  imports: [TooltipDirective],
  template: `@for (role of heldRoleStrings; track $index) {
    <!-- SVGs in apps/frontend/src/assets/images/badges/roles must have
         filenames corresponding to RoleNames! -->
    <img
      [src]="'assets/images/badges/' + role + '.svg'"
      [mTooltip]="role"
      [alt]="role + ' Badge'"
      [class]="'h-full aspect-square opacity-90 drop-shadow ' + classes"
    />
  }`,
  styles: ':host { display: flex; gap: 0.25rem; }'
})
export class RoleBadgesComponent implements OnChanges {
  @Input({ required: true }) roles!: Flags<Role>;

  @Input() ignored: Role[];

  @Input() classes = '';

  private readonly available: Role[] = [
    Role.ADMIN,
    Role.MODERATOR,
    Role.VERIFIED,
    Role.MAPPER,
    Role.PORTER,
    Role.REVIEWER,
    Role.PLACEHOLDER,
    Role.DELETED,
    Role.LIMITED
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
