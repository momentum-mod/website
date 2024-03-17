import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnChanges
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from './icon.service';
import { DEFAULT_ICON_PACK, Icon, IconPack } from './index';

@Component({
  selector: 'm-icon',
  template: '',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent implements OnChanges {
  @Input({ required: true }) icon!: Icon | null;
  @Input() pack: IconPack = DEFAULT_ICON_PACK;

  @HostBinding('innerHtml')
  html: SafeHtml = '';

  constructor(
    private readonly iconService: IconService,
    private readonly sanitzer: DomSanitizer
  ) {}

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
