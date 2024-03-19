import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CombinedRoles } from '@momentum/constants';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../icons';
import { LocalUserService, LayoutService, SidenavState } from '../../services';
import { TooltipDirective } from '../../directives';
import { SIDENAV_ITEMS } from '../../side-menu.const';

@Component({
  selector: 'm-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  standalone: true,
  imports: [IconComponent, RouterLink, CommonModule, TooltipDirective]
})
export class SidenavComponent implements OnInit {
  protected collapsed = false;
  protected isLoggedIn = false;
  protected isMod = false;

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly layoutService: LayoutService
  ) {}

  ngOnInit() {
    this.handleLoggedInState();

    this.layoutService.sidenavToggled.subscribe((state) => {
      this.collapsed = state === SidenavState.CLOSED;
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
}
