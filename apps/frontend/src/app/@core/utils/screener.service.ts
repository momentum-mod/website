import { Injectable } from '@angular/core';
import { OutgoingModule } from '../../pages/outgoing/outgoing.module';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ScreenerService {
  constructor(private router: Router) {}

  static isWhitelistedDomain(href: URL): boolean {
    for (const domain of OutgoingModule.WHITELISTED_OUTGOING_DOMAINS) {
      if (
        href.hostname === domain ||
        href.hostname.includes(domain) ||
        href.host === domain ||
        href.host.includes(domain)
      )
        return true;
    }
    for (const protocol of OutgoingModule.WHITELISTED_OUTGOING_PROTOCOLS) {
      if (href.protocol === protocol || href.protocol.includes(protocol))
        return true;
    }
    return false;
  }

  inject(): void {
    document.addEventListener('click', this.intercept.bind(this));
  }

  intercept(event: PointerEvent): void {
    if (
      window.location.pathname.startsWith('/outgoing') ||
      !(event || !event.target || !(event.button === 1 || event.button === 2))
    )
      return;

    if (!(event.target as any).href) return;
    const element = event.target as HTMLAnchorElement;
    const url = new URL(element.href);
    if (!ScreenerService.isWhitelistedDomain(url)) {
      this.router.navigate(['/outgoing/', encodeURIComponent(element.href)]);
      event.preventDefault(); // Prevent default action and stop event propagation
    }
  }
}
