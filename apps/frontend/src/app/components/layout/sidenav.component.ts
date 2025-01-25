import { Component } from '@angular/core';
import { CombinedRoles } from '@momentum/constants';
import { SIDENAV_ITEMS } from '../../side-menu.const';
import { SharedModule } from '../../shared.module';
import { LocalUserService } from '../../services/data/local-user.service';
import { LayoutService, SidenavState } from '../../services/layout.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'm-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  imports: [SharedModule]
})
export class SidenavComponent {
  protected collapsed: Observable<boolean> =
    this.layoutService.sidenavToggled.pipe(
      map((state) => state === SidenavState.CLOSED)
    );

  protected menuItems: Observable<typeof SIDENAV_ITEMS> =
    this.localUserService.user.pipe(
      map((user) => {
        const isLoggedIn = user != null;
        const isMod = this.localUserService.hasRole(CombinedRoles.MOD_OR_ADMIN);
        return SIDENAV_ITEMS.filter(
          ({ needsMod, isPublic }) => isPublic || !needsMod || isMod
        ).map((entry) => ({
          ...entry,
          items: entry.items.filter(
            (item) => entry.isPublic || item.isPublic || isLoggedIn
          )
        }));
      })
    );

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly layoutService: LayoutService
  ) {}
}
