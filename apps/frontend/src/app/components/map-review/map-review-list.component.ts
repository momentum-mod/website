import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MapReview, MMap } from '@momentum/constants';
import { forkJoin, merge, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { PaginatorState } from '@openng/optimus-ui/paginator';
import { MessageService } from '@openng/optimus-ui/api';
import { PaginatorModule } from '@openng/optimus-ui/paginator';
import { MapReviewComponent } from './map-review.component';
import { MapReviewFormComponent } from './map-review-form.component';
import { MapsService } from '../../services/data/maps.service';
import { LocalUserService } from '../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Select } from '@openng/optimus-ui/select';
import { FormsModule } from '@angular/forms';
import { SpinnerDirective } from '../../directives/spinner.directive';

enum FilterType {
  NONE,
  OFFICIAL,
  UNOFFICIAL
}

@Component({
  selector: 'm-map-review-list',
  imports: [
    PaginatorModule,
    MapReviewComponent,
    MapReviewFormComponent,
    Select,
    FormsModule,
    SpinnerDirective
  ],
  templateUrl: './map-review-list.component.html'
})
export class MapReviewListComponent {
  private readonly mapsService = inject(MapsService);
  private readonly messageService = inject(MessageService);
  protected readonly localUserService = inject(LocalUserService);

  protected readonly Filters = [
    { type: FilterType.NONE, label: 'All reviews' },
    { type: FilterType.OFFICIAL, label: 'Official Reviewers' },
    { type: FilterType.UNOFFICIAL, label: 'Unofficial reviewers' }
  ];

  readonly map = input.required<MMap>();
  // Updated from the stats endpoint after each load, rather than refetching
  // the whole map; resets whenever the map input changes.
  protected readonly reviewStats = linkedSignal(() => this.map().reviewStats);
  protected readonly reviews = signal<MapReview[]>([]);

  public readonly load = new Subject<void>();
  protected readonly pageChange = new Subject<PaginatorState>();
  protected readonly loading = signal(false);
  protected readonly rows = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly first = signal(0);

  protected readonly filter = signal(FilterType.NONE);

  constructor() {
    merge(
      // Initial load, and reload whenever the map input changes.
      toObservable(this.map),
      this.pageChange.pipe(
        tap(({ first, rows }) => {
          this.first.set(first);
          this.rows.set(rows);
        })
      ),
      this.load
    )
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(() => {
          let filter: boolean | undefined;
          switch (this.filter()) {
            case FilterType.OFFICIAL:
              filter = true;
              break;
            case FilterType.UNOFFICIAL:
              filter = false;
              break;
          }
          return forkJoin([
            this.mapsService.getMapReviews(this.map().id, {
              expand: ['reviewer', 'resolver'],
              official: filter,
              comments: 5,
              take: this.rows(),
              skip: this.first()
            }),
            this.mapsService.getMapReviewStats(this.map().id)
          ]);
        })
      )
      .subscribe({
        next: ([pagedRes, statsRes]) => {
          this.reviews.set(pagedRes.data);
          this.totalRecords.set(pagedRes.totalCount);
          this.reviewStats.set(statsRes);
          this.loading.set(false);
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching maps!',
            detail: httpError.error.message
          });
          this.loading.set(false);
        }
      });
  }
}
