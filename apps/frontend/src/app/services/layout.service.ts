import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';

export const SIDENAV_LS_KEY = 'sideNavOpen';

export enum SidenavState {
  OPEN = 'open',
  CLOSED = 'closed'
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  public readonly sidenavToggled = new BehaviorSubject<SidenavState>(
    SidenavState.OPEN
  );

  constructor() {
    const storedState = localStorage.getItem(
      SIDENAV_LS_KEY
    ) as SidenavState | null;
    if (storedState != null) {
      this.setSidenavState(storedState);
    } else {
      this.setSidenavState(SidenavState.OPEN);
    }
  }

  setSidenavState(state: SidenavState): void {
    localStorage.setItem(SIDENAV_LS_KEY, state);
    this.sidenavToggled.next(state);
  }

  toggleSidenavState(): void {
    this.sidenavToggled
      .pipe(first())
      .subscribe((current) =>
        this.setSidenavState(
          current === SidenavState.OPEN
            ? SidenavState.CLOSED
            : SidenavState.OPEN
        )
      );
  }
}
