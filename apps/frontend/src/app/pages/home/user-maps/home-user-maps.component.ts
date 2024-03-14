import { Component, DestroyRef, OnInit } from '@angular/core';
import { CombinedMapStatuses, MapStatus } from '@momentum/constants';
import { LocalUserService } from '../../../services';
import { SharedModule } from '../../../shared.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'm-home-user-maps',
  templateUrl: './home-user-maps.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class HomeUserMapsComponent implements OnInit {
  protected readonly MapStatus = MapStatus;
  protected approved: number;
  protected submission: number;

  protected loading = true;

  constructor(
    private readonly userService: LocalUserService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit() {
    this.userService
      .getSubmittedMapSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.approved =
            response.find(({ status }) => status === MapStatus.APPROVED)
              ?.statusCount ?? 0;
          this.submission =
            response
              .filter(({ status }) =>
                CombinedMapStatuses.IN_SUBMISSION.includes(status)
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
