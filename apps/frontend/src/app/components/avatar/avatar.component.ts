import { Component, computed, input } from '@angular/core';
import { STEAM_MISSING_AVATAR_URL } from '@momentum/constants';

/**
 * Simple user avatar component.
 * This has no height by default, you need to give it a specific value via
 * CSS/Tailwind.
 */
@Component({
  selector: 'm-avatar',
  template: `
    <img
      [src]="actualUrl()"
      class="aspect-square h-full rounded-sm shadow-md"
    />
  `
})
export class AvatarComponent {
  readonly url = input<string>();
  readonly actualUrl = computed(() => this.url() ?? STEAM_MISSING_AVATAR_URL);
}
