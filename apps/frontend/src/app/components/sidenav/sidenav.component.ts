import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../icons';
import { LocalUserService } from '../../services';
import { CombinedRoles } from '@momentum/constants';
import { CommonModule } from '@angular/common';
import { LayoutService, SidenavState } from '../../services/layout.service';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { SIDENAV_ITEMS } from '../../side-menu.const';

@Component({
  selector: 'm-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  standalone: true,
  imports: [IconComponent, RouterLink, CommonModule, TooltipDirective]
})
export class SidenavComponent implements OnInit {
  protected state: SidenavState;
  protected isLoggedIn = false;
  protected isMod = false;

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly layoutService: LayoutService
  ) {}

  ngOnInit() {
    this.handleLoggedInState();

    this.layoutService.sidenavToggled.subscribe((state) => {
      this.state = state;
    });

    this.localUserService.localUserSubject.subscribe(
      this.handleLoggedInState.bind(this)
    );
  }

  handleLoggedInState() {
    this.isLoggedIn = this.localUserService.isLoggedIn();
    this.isMod = this.localUserService.hasRole(CombinedRoles.MOD_OR_ADMIN);
  }

  getMenuItems(): typeof SIDENAV_ITEMS {
    return SIDENAV_ITEMS.filter(({ needsMod }) => !needsMod || this.isMod);
  }

  isCollapsed(): boolean {
    return this.state === SidenavState.CLOSED;
  }
}
