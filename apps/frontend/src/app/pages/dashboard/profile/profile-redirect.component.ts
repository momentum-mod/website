import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalUserService } from '@momentum/frontend/data';
import { firstValueFrom } from 'rxjs';

/**
 * Redirects `/profile` to `/profile/<logged-in-ID>` if has a logged in user,
 * otherwise to home page.
 */
@Component({ selector: 'mom-profile-redirect-local', template: '' })
export class ProfileRedirectComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly localUserService: LocalUserService
  ) {}

  async ngOnInit(): Promise<void> {
    const localUser = await firstValueFrom(this.localUserService.getLocal());

    await this.router.navigate([
      localUser?.id ? `/dashboard/profile/${localUser.id}` : '/dashboard'
    ]);
  }
}
