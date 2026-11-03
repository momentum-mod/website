import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
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
  protected readonly approved = signal<number | null>(null);
  protected readonly submission = signal<number | null>(null);

  protected readonly loading = signal(true);

  ngOnInit() {
    this.userService.user
      .pipe(
        filter(Boolean),
        switchMap(() => this.userService.getSubmittedMapSummary()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.approved.set(
            response.find(({ status }) => status === MapStatus.APPROVED)
              ?.statusCount ?? 0
          );
          this.submission.set(
            response
              .filter(({ status }) =>
                MapStatuses.IN_SUBMISSION.includes(status)
              )
              .map(({ statusCount }) => statusCount)
              .reduce((a, c) => a + c, 0) ?? 0
          );
        },
        error: (error) => {
          this.loading.set(false);
          console.error(error);
        }
      });
  }
}
