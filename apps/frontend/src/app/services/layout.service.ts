import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter, first } from 'rxjs/operators';

export const SIDENAV_LS_KEY = 'sideNavOpen';
export const BG_STATE_LS_KEY = 'customBgState';

/**
 * Viewports narrower than this are treated as mobile, where the sidenav is an
 * off-canvas drawer rather than a persistent sidebar. Must match Tailwind's
 * `md` breakpoint in tailwind.config.js, and the `@media` queries in the app,
 * header and sidenav CSS.
 */
export const MOBILE_MEDIA_QUERY = '(max-width: 767.98px)';

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
  private readonly router = inject(Router);

  private readonly mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

  public readonly isMobile = new BehaviorSubject<boolean>(
    this.mobileQuery.matches
  );

  /**
   * On desktop, OPEN/CLOSED is the full/collapsed sidebar, and is persisted.
   * On mobile it's whether the drawer is showing, which always starts CLOSED
   * and is never persisted.
   */
  public readonly sidenavToggled = new BehaviorSubject<SidenavState>(
    this.getInitialSidenavState()
  );

  private backgroundReservations: RegExp[] = [];

  public readonly backgroundChange = new BehaviorSubject<string | null>(null);
  public readonly backgroundEnable = new BehaviorSubject<boolean>(true);

  constructor() {
    this.mobileQuery.addEventListener('change', ({ matches }) => {
      this.isMobile.next(matches);
      // Don't carry the drawer's state over to the sidebar, or vice versa.
      this.sidenavToggled.next(this.getInitialSidenavState());
    });

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
            event instanceof NavigationEnd &&
            !this.backgroundReservations.some((r) => r.test(event.url))
        )
      )
      .subscribe(() => this.resetBackgroundImage());

    // The drawer covers the page, so dismiss it after navigating.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile.value) this.setSidenavState(SidenavState.CLOSED);
      });
  }

  private getInitialSidenavState(): SidenavState {
    if (this.isMobile.value) return SidenavState.CLOSED;

    const storedState = localStorage.getItem(SIDENAV_LS_KEY);
    return storedState === SidenavState.CLOSED
      ? SidenavState.CLOSED
      : SidenavState.OPEN;
  }

  setSidenavState(state: SidenavState): void {
    if (!this.isMobile.value) localStorage.setItem(SIDENAV_LS_KEY, state);

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

    localStorage.setItem(BG_STATE_LS_KEY, state);
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
    if (Array.isArray(regex)) {
      this.backgroundReservations.push(...regex);
    } else {
      this.backgroundReservations.push(regex);
    }
  }
}
