import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  tap
} from 'rxjs/operators';
import { EMPTY, merge, of, Subject } from 'rxjs';
import {
  MapFavorite,
  MapsGetAllQuery,
  PagedResponse,
  MMap
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PaginatorModule } from 'primeng/paginator';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PaginatorState } from 'primeng/paginator/paginator.interface';
import { SpinnerDirective } from '../../directives';
import { SharedModule } from '../../shared.module';
import { LocalUserService, MapsService } from '../../services';
import { MapListItemComponent } from './map-list-item.component';
import { ActivityContentComponent } from '../activity/activity-content.component';

// This scary looking type is just the optional query params on map gets, plus
// a thing for deciding if we should call the favorites-only endpoint.
export type MapListFiltersForm = FormGroup<
  Partial<
    {
      [K in keyof Omit<
        MapsGetAllQuery,
        'skip' | 'take' | 'expand'
      >]: FormControl<MapsGetAllQuery[K]>;
    } & { favorites: FormControl<boolean> }
  >
>;

@Component({
  selector: 'm-map-list',
  templateUrl: './map-list.component.html',
  standalone: true,
  imports: [
    SharedModule,
    MapListItemComponent,
    DropdownModule,
    InputSwitchModule,
    PaginatorModule,
    ActivityContentComponent,
    InfiniteScrollModule,
    SpinnerDirective
  ],
  styles: [
    `
      :host {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
    `
  ]
})
export class MapListComponent implements OnInit {
  @Input() isUpload = false;
  @Input() filters?: MapListFiltersForm;

  protected loading = false;
  protected readonly pageChange = new Subject<PaginatorState>();

  protected maps: MMap[] = [];
  protected rows = 12;
  protected totalRecords = 0;
  protected first = 0;

  constructor(
    private readonly mapsService: MapsService,
    private readonly messageService: MessageService,
    private readonly localUserService: LocalUserService
  ) {}

  ngOnInit() {
    merge(
      of(null),
      this.pageChange.pipe(
        tap(({ first, rows }) => {
          this.first = first;
          this.rows = rows;
        })
      ),
      this.filters?.valueChanges.pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        debounceTime(200),
        tap(() => {
          this.maps = [];
          this.first = 0;
          this.totalRecords = 0;
        })
      ) ?? EMPTY
    )
      .pipe(
        filter(() => !this.filters || this.filters?.valid),
        tap(() => (this.loading = true)),
        switchMap(() => {
          const { favorites, ...filters } = this.filters?.value ?? {};
          const options = {
            ...Object.fromEntries(
              Object.entries(filters).filter(([_, v]) => Boolean(v))
            ),
            skip: this.first,
            take: this.rows
          };

          if (this.isUpload) {
            return this.localUserService.getSubmittedMaps({
              ...options,
              expand: ['submitter', 'thumbnail', 'inFavorites', 'leaderboards']
            });
          } else if (favorites) {
            return this.localUserService.getMapFavorites({
              ...options,
              expand: ['submitter', 'thumbnail']
            });
          } else {
            return this.mapsService.getMaps({
              ...options,
              expand: ['submitter', 'thumbnail', 'inFavorites', 'leaderboards']
            });
          }
        }),
        tap(() => (this.loading = false))
      )
      .subscribe({
        next: (res: PagedResponse<MMap>) => {
          if (res.returnCount > 0)
            if ((res.data as any)[0].user)
              // The favorites endpoint actually actually returns a
              // MapFavoriteDto, which contains a nested MMap
              this.maps = (res.data as any as MapFavorite[]).map(
                ({ map }) => map
              );
            else this.maps = res.data;
          else this.maps = [];
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

  hasFilters(): boolean {
    if (!this.filters?.value) return false;

    return Object.values(this.filters.value).some(
      (v) => v != null && !(typeof v == 'string' && v === '')
    );
  }
}
