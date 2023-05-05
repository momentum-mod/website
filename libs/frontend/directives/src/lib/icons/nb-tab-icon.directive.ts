import { Directive, Input } from '@angular/core';
import { Icon, IconPack } from '@momentum/frontend/icons';
import { NbIconConfig } from '@nebular/theme';

@Directive({ selector: 'nb-tab[tabIcon]' })
export class NbTabIconDirective {
  // This is a bit silly, but we *always* use an icon pack, so you always need
  // to use an NbIconConfig, not just a string.
  @Input() tabIcon!: NbIconConfig & { icon: Icon; pack: IconPack };
}
