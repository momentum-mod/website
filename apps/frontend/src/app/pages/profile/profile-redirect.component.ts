import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalUserService } from '@momentum/frontend/data';

/**
 * Redirects `/profile` to `/profile/<logged-in-ID>` if has a logged in user,
 * otherwise to home page.
 */
@Component({
  selector: 'm-profile-redirect-local',
  template: '',
  standalone: true
})
export class ProfileRedirectComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly localUserService: LocalUserService
  ) {}

  async ngOnInit(): Promise<void> {
    const localUser = this.localUserService.localUser;

    await this.router.navigate([
      localUser?.id ? `/profile/${localUser.id}` : '/'
    ]);
  }
}
