import { Component, Input, OnInit } from '@angular/core';
import { User, Role } from '@momentum/constants';
import { LocalUserService } from '@momentum/frontend/data';
import { NbTooltipModule } from '@nebular/theme';
import { NgIf, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mom-user-search-result',
  templateUrl: './user-search-result.component.html',
  standalone: true,
  imports: [RouterLink, NgIf, NgOptimizedImage, NbTooltipModule]
})
export class UserSearchResultComponent implements OnInit {
  @Input() user: User;
  userRoles: {
    isPlaceholder: boolean;
    isMapper: boolean;
    isMod: boolean;
    isAdmin: boolean;
    isVerified: boolean;
  };

  constructor(public userService: LocalUserService) {
    this.userRoles = {
      isPlaceholder: false,
      isMapper: false,
      isMod: false,
      isAdmin: false,
      isVerified: false
    };
  }

  ngOnInit() {
    this.userRoles = {
      isPlaceholder: this.hasRole(Role.PLACEHOLDER),
      isMapper: this.hasRole(Role.MAPPER),
      isMod: this.hasRole(Role.MODERATOR),
      isAdmin: this.hasRole(Role.ADMIN),
      isVerified: this.hasRole(Role.VERIFIED)
    };
  }

  hasRole(role: Role) {
    return this.userService.hasRole(role, this.user);
  }
}
