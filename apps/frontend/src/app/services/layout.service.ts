import { Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter, first } from 'rxjs/operators';

export const SIDENAV_LS_KEY = 'sideNavOpen';
export const BG_STATE_LS_KEY = 'customBgState';

// Using enums here as localStorage only stores strings.
export enum SidenavState {
  OPEN = 'open',
  CLOSED = 'closed'
}

export enum BackgroundState {
  ENABLED = 'enabled',
  DISABLED = 'disabled'
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  public readonly sidenavToggled = new BehaviorSubject<SidenavState>(
    SidenavState.OPEN
  );

  private backgroundReservations: RegExp[] = [];

  public readonly backgroundChange = new BehaviorSubject<string | null>(null);
  public readonly backgroundEnable = new BehaviorSubject<boolean>(true);

  constructor(private readonly router: Router) {
    const storedState = localStorage.getItem(
      SIDENAV_LS_KEY
    ) as SidenavState | null;
    if (storedState != null) {
      this.setSidenavState(storedState);
    } else {
      this.setSidenavState(SidenavState.OPEN);
    }

    const bgState = localStorage.getItem(BG_STATE_LS_KEY) as BackgroundState;
    if (bgState != null) {
      this.setBackgroundState(bgState);
    } else {
      this.setBackgroundState(BackgroundState.ENABLED);
    }

    this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart &&
            !this.backgroundReservations.some((r) => r.test(event.url))
        )
      )
      .subscribe(() => this.resetBackgroundImage());
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

  resetBackgroundImage(): void {
    this.setBackgroundImage(null);
  }

  setBackgroundImage(imageUrl: string | null) {
    this.backgroundChange.next(imageUrl);
  }

  setBackgroundState(state: BackgroundState): void {
    const enable = state === BackgroundState.ENABLED;
    if (this.backgroundEnable.value === enable) return;

    localStorage.setItem(SIDENAV_LS_KEY, state);
    this.backgroundEnable.next(enable);
  }

  toggleBackgroundEnable(): void {
    this.setBackgroundState(
      this.backgroundEnable.value
        ? BackgroundState.DISABLED
        : BackgroundState.ENABLED
    );
  }

  /**
   * Register a router URL that uses a custom background. If a route is *not*
   * reserved, the background will be reset to default when it's navigated to.
   */
  reserveBackgroundUrl(regex: RegExp | RegExp[]) {
    Array.isArray(regex)
      ? this.backgroundReservations.push(...regex)
      : this.backgroundReservations.push(regex);
  }
}
