import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from './icon.service';
import { DEFAULT_ICON_PACK, Icon, IconPack } from './index';

@Component({
  selector: 'm-icon',
  template: '',
  host: { '[innerHtml]': 'html()' }
})
export class IconComponent {
  private readonly iconService = inject(IconService);
  private readonly sanitzer = inject(DomSanitizer);

  readonly icon = input.required<Icon | null>();
  readonly pack = input<IconPack>(DEFAULT_ICON_PACK);

  protected readonly html = computed<SafeHtml>(() => {
    const icon = this.icon();
    if (!icon) return '';

    const svg = this.iconService.getIcon(icon, this.pack());
    if (!svg) return '';

    return this.sanitzer.bypassSecurityTrustHtml(svg);
  });
}
