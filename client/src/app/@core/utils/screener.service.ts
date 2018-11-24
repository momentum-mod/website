import {Injectable} from '@angular/core';
import {OutgoingModule} from '../../pages/outgoing/outgoing.module';

@Injectable()
export class ScreenerService {
  constructor() {}
  inject(): void {
    document.onclick = ScreenerService.intercept;
  }
  static checkHref(href: URL): boolean {
    for (const domain of OutgoingModule.whitelistedOutgoingDomains) {
      if (href.hostname === domain || href.host === domain ||
        href.hostname.includes(domain) || href.host.includes(domain))
        return true;
    }
    return false;
  }
  static intercept(_event) {
    const tEvent = _event || window.event;

    const element = tEvent.target || tEvent.srcElement;
    if (element.href && element.tagName === 'A' && !element.classList.contains('allowed')) {
      const url: URL = new URL(element.href);
      if (!ScreenerService.checkHref(url)) {
        window.location.href = '/outgoing/' + encodeURIComponent(element.href);
        return false; // prevent default action and stop event propagation
      }
    }
  }
}
