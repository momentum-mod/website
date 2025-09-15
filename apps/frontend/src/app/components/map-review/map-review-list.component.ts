import { Component, Input, OnChanges, inject } from '@angular/core';
import { MapReview, MMap } from '@momentum/constants';
import { forkJoin, merge, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { PaginatorState } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import { MapReviewComponent } from './map-review.component';
import { MapReviewFormComponent } from './map-review-form.component';

import { MapsService } from '../../services/data/maps.service';
import { LocalUserService } from '../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Select } from 'primeng/select';
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
export class MapReviewListComponent implements OnChanges {
  private readonly mapsService = inject(MapsService);
  private readonly messageService = inject(MessageService);
  protected readonly localUserService = inject(LocalUserService);

  protected readonly Filters = [
    { type: FilterType.NONE, label: 'All reviews' },
    { type: FilterType.OFFICIAL, label: 'Official Reviewers' },
    { type: FilterType.UNOFFICIAL, label: 'Unofficial reviewers' }
  ];

  @Input({ required: true }) map: MMap;
  protected reviews: MapReview[] = [];
  protected isSubmitter = false;

  public readonly load = new Subject<void>();
  protected readonly pageChange = new Subject<PaginatorState>();
  protected loading = false;
  protected rows = 5;
  protected totalRecords = 0;
  protected first = 0;

  protected filter = FilterType.NONE;

  constructor() {
    merge(
      this.pageChange.pipe(
        tap(({ first, rows }) => {
          this.first = first;
          this.rows = rows;
        })
      ),
      this.load
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() => {
          let filter: boolean | undefined;
          switch (this.filter) {
            case FilterType.OFFICIAL:
              filter = true;
              break;
            case FilterType.UNOFFICIAL:
              filter = false;
              break;
          }
          return forkJoin([
            this.mapsService.getMapReviews(this.map.id, {
              expand: ['reviewer', 'resolver'],
              official: filter,
              comments: 5,
              take: this.rows,
              skip: this.first
            }),
            this.mapsService.getMapReviewStats(this.map.id)
          ]);
        })
      )
      .subscribe({
        next: ([pagedRes, statsRes]) => {
          this.reviews = pagedRes.data;
          this.totalRecords = pagedRes.totalCount;
          // Mutating actual map object here so don't have to re-request the
          // entire thing just to update stats.
          this.map.reviewStats = statsRes;
          this.loading = false;
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching maps!',
            detail: httpError.error.message
          });
          this.loading = false;
        }
      });
  }

  ngOnChanges(): void {
    this.load.next();
    this.isSubmitter =
      this.localUserService.user.value?.id === this.map.submitterID;
  }
}
