import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@momentum/frontend/icons';
import { LocalUserService } from '@momentum/frontend/data';
import { Subject } from 'rxjs';
import { CombinedRoles } from '@momentum/constants';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { LayoutService, SidenavState } from '../../services/layout.service';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { SIDENAV_ITEMS } from '../../side-menu.const';

@Component({
  selector: 'm-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  standalone: true,
  imports: [IconComponent, RouterLink, CommonModule, TooltipDirective]
})
export class SidenavComponent implements OnInit, OnDestroy {
  protected readonly SidenavState = SidenavState;
  protected state: SidenavState;
  protected isLoggedIn = false;
  protected isMod = false;

  private readonly ngUnsub = new Subject<void>();

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly layoutService: LayoutService
  ) {}

  ngOnInit() {
    this.handleLoggedInState();

    this.layoutService.sidenavToggled
      .pipe(takeUntil(this.ngUnsub))
      .subscribe((state) => (this.state = state));

    this.localUserService.localUserSubject
      .pipe(takeUntil(this.ngUnsub))
      .subscribe(this.handleLoggedInState.bind(this));
  }

  ngOnDestroy() {
    this.ngUnsub.next();
    this.ngUnsub.complete();
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
