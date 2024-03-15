import { Component, Input, OnChanges } from '@angular/core';
import { MapReview, MMap } from '@momentum/constants';
import { merge, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { PaginatorState } from 'primeng/paginator/paginator.interface';
import { MessageService } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import { MapReviewComponent } from './map-review.component';
import { MapReviewFormComponent } from './map-review-form.component';
import { SharedModule } from '../../shared.module';
import { MapsService } from '../../services/data/maps.service';
import { LocalUserService } from '../../services/data/local-user.service';

enum FilterType {
  NONE,
  OFFICIAL,
  UNOFFICIAL
}

@Component({
  selector: 'm-map-review-list',
  standalone: true,
  imports: [
    SharedModule,
    PaginatorModule,
    MapReviewComponent,
    MapReviewFormComponent
  ],
  templateUrl: './map-review-list.component.html'
})
export class MapReviewListComponent implements OnChanges {
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

  constructor(
    private readonly mapsService: MapsService,
    private readonly messageService: MessageService,
    private readonly localUserService: LocalUserService
  ) {
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
          return this.mapsService.getMapReviews(this.map.id, {
            expand: ['reviewer', 'resolver'],
            official: filter,
            comments: 5,
            take: this.rows,
            skip: this.first
          });
        }),
        tap(() => (this.loading = false))
      )
      .subscribe({
        next: (res) => {
          this.reviews = res.data;
          this.totalRecords = res.totalCount;
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching maps!',
            detail: err.message
          });
        }
      });
  }

  ngOnChanges(): void {
    this.load.next();
    this.isSubmitter =
      this.localUserService.localUser.id === this.map.submitterID;
  }
}
