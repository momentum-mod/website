import { Component, inject } from '@angular/core';
import { CombinedRoles } from '@momentum/constants';
import { SIDENAV_ITEMS } from '../../side-menu.const';

import { LocalUserService } from '../../services/data/local-user.service';
import { LayoutService, SidenavState } from '../../services/layout.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../icons';
import { AsyncPipe, NgClass } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'm-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  imports: [IconComponent, RouterModule, AsyncPipe, TooltipDirective, NgClass]
})
export class SidenavComponent {
  private readonly localUserService = inject(LocalUserService);
  private readonly layoutService = inject(LayoutService);

  protected collapsed: Observable<boolean> =
    this.layoutService.sidenavToggled.pipe(
      map((state) => state === SidenavState.CLOSED)
    );

  protected menuItems: Observable<typeof SIDENAV_ITEMS> =
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
    );
}
