import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnChanges,
  inject
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from './icon.service';
import { DEFAULT_ICON_PACK, Icon, IconPack } from './index';

@Component({
  selector: 'm-icon',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent implements OnChanges {
  private readonly iconService = inject(IconService);
  private readonly sanitzer = inject(DomSanitizer);

  @Input({ required: true }) icon!: Icon | null;
  @Input() pack: IconPack = DEFAULT_ICON_PACK;

  @HostBinding('innerHtml')
  html: SafeHtml = '';

  ngOnChanges() {
    this.renderIcon();
  }

  renderIcon() {
    if (!this.icon) {
      this.html = '';
      return;
    }

    const svg = this.iconService.getIcon(this.icon, this.pack);

    if (!svg) {
      this.html = '';
      return;
    }

    this.html = this.sanitzer.bypassSecurityTrustHtml(svg);
  }
}
