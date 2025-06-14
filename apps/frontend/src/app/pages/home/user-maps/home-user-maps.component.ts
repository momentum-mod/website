import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { MapStatuses, MapStatus } from '@momentum/constants';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocalUserService } from '../../../services/data/local-user.service';
import { filter, switchMap } from 'rxjs';
import { CardComponent } from '../../../components/card/card.component';

@Component({
  selector: 'm-home-user-maps',
  imports: [CardComponent],
  templateUrl: './home-user-maps.component.html'
})
export class HomeUserMapsComponent implements OnInit {
  private readonly userService = inject(LocalUserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly MapStatus = MapStatus;
  protected approved: number;
  protected submission: number;

  protected loading = true;

  ngOnInit() {
    this.userService.user
      .pipe(
        filter(Boolean),
        switchMap(() => this.userService.getSubmittedMapSummary()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.approved =
            response.find(({ status }) => status === MapStatus.APPROVED)
              ?.statusCount ?? 0;
          this.submission =
            response
              .filter(({ status }) =>
                MapStatuses.IN_SUBMISSION.includes(status)
              )
              .map(({ statusCount }) => statusCount)
              .reduce((a, c) => a + c, 0) ?? 0;
        },
        error: (error) => {
          this.loading = false;
          console.error(error);
        }
      });
  }
}
