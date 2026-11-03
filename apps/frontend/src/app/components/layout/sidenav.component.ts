import { Component, computed, inject } from '@angular/core';
import { CombinedRoles } from '@momentum/constants';
import { SIDENAV_ITEMS } from '../../side-menu.const';
import { LocalUserService } from '../../services/data/local-user.service';
import { LayoutService, SidenavState } from '../../services/layout.service';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../icons';
import { NgClass } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'm-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  imports: [IconComponent, RouterModule, TooltipDirective, NgClass]
})
export class SidenavComponent {
  private readonly localUserService = inject(LocalUserService);
  private readonly layoutService = inject(LayoutService);

  protected readonly collapsed = toSignal(
    this.layoutService.sidenavToggled.pipe(
      map((state) => state === SidenavState.CLOSED)
    )
  );
  private readonly isMobile = toSignal(this.layoutService.isMobile);

  /**
   * Item names are only hidden (so need tooltips) when the desktop sidebar is
   * collapsed. In the mobile drawer they're always visible.
   */
  protected readonly showTooltips = computed(
    () => this.collapsed() && !this.isMobile()
  );

  protected close() {
    this.layoutService.setSidenavState(SidenavState.CLOSED);
  }

  protected readonly menuItems = toSignal(
    this.localUserService.user.pipe(
      map((user) => {
        const isLoggedIn = user != null;
        const isMod = this.localUserService.hasRole(CombinedRoles.MOD_OR_ADMIN);
        const isLimited = this.localUserService.isLimited;
        return SIDENAV_ITEMS.filter(
          ({ needsMod, isPublic }) => isPublic || !needsMod || isMod
        ).map((entry) => ({
          ...entry,
          items: entry.items.filter(
            (item) =>
              (entry.isPublic || item.isPublic || isLoggedIn) &&
              (!item.hideOnLimited || !isLimited)
          )
        }));
      })
    ),
    { initialValue: [] as typeof SIDENAV_ITEMS }
  );
}
