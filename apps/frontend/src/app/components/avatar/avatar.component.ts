import { Component, Input } from '@angular/core';
import { STEAM_MISSING_AVATAR_URL } from '@momentum/constants';

/**
 * Simple user avatar component.
 * This has no height by default, you need to give it a specific value via
 * CSS/Tailwind.
 */
@Component({
  selector: 'm-avatar',
  template: `
    <img [src]="url" class="aspect-square h-full rounded shadow-md" />
  `
})
export class AvatarComponent {
  @Input() url: string = STEAM_MISSING_AVATAR_URL;
}
