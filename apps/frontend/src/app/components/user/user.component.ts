import { Component, Input } from '@angular/core';
import { User } from '@momentum/constants';
import { AvatarComponent } from '../avatar/avatar.component';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RoleBadgesComponent } from '../role-badges/role-badges.component';

/**
 * Simple component for showing user avatar and alias. Use an m-avatar if you
 * just need the avatar, or something more complex.
 *
 * Need to use ! prefixes in Tailwind for now as I can't be fucked to figure
 * out CSS specificity stuff.
 */
@Component({
  selector: 'm-user',
  imports: [AvatarComponent, NgClass, RoleBadgesComponent, RouterLink],
  template: ` @if (user) {
    <m-avatar
      class="h-8 shadow"
      [ngClass]="avatarClass"
      [url]="user.avatarURL"
    />
    <a
      [routerLink]="'/profile/' + user.id"
      class="text-lg text-shadow transition-colors [:hover>&]:text-blue-200"
      [ngClass]="aliasClass"
    >
      {{ user.alias }}
    </a>
    @if (badges && user.roles > 0) {
      <m-role-badges [roles]="user.roles" [ngClass]="badgesClass" />
    }
  }`,
  styles: [
    `
      :host {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    `
  ]
})
export class UserComponent {
  @Input({ required: true }) user!: User;
  @Input() aliasClass?: string;
  @Input() avatarClass?: string;
  @Input() badges = false;
  @Input() badgesClass?: string;
}
