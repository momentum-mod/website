import { Component, Input } from '@angular/core';
import { STEAM_MISSING_AVATAR_URL } from '@momentum/constants';

@Component({
  selector: 'm-avatar',
  standalone: true,
  template: `
    <img [src]="url" class="aspect-square h-full rounded shadow-md" />
  `,
  styles: ':host { height: 1.5rem; }'
})
export class AvatarComponent {
  @Input() url: string = STEAM_MISSING_AVATAR_URL;
}
