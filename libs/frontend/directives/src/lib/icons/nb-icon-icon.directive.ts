import { Directive, Input } from '@angular/core';
import { Icon, IconPack } from '@momentum/frontend/icons';

@Directive({ selector: 'nb-icon' })
export class NbIconIconDirective {
  @Input() icon!: Icon;
  // Nice to be able to use the <nb-icon> component but we always want our
  // own icons. So require one of these packs be used.
  @Input() pack!: IconPack;
}
