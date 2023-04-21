import { Injectable } from '@angular/core';
import { OutgoingModule } from '../../pages/outgoing/outgoing.module';
import { Router } from '@angular/router';

@Injectable()
export class ScreenerService {
  constructor(private router: Router) {}
  inject(): void {
    document.addEventListener('click', this.intercept.bind(this));
  }
  static checkHref(href: URL): boolean {
    for (const domain of OutgoingModule.WHITELISTED_OUTGOING_DOMAINS) {
      if (
        href.hostname === domain ||
        href.host === domain ||
        href.hostname.includes(domain) ||
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
  intercept(_event) {
    const tEvent = _event || window.event;
    const element = tEvent.target || tEvent.srcElement;
    if (
      (tEvent.which === 1 || tEvent.which === 2) &&
      element.href &&
      element.tagName === 'A' &&
      !window.location.pathname.startsWith('/outgoing')
    ) {
      const url: URL = new URL(element.href);
      if (!ScreenerService.checkHref(url)) {
        this.router.navigate(['/outgoing/', encodeURIComponent(element.href)]);
        return false; // prevent default action and stop event propagation
      }
    }
  }
}
