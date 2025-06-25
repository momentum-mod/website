import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  Ban,
  MapStatusName,
  MapStatus,
  MapSummary,
  MMap,
  PagedResponse,
  MapsGetAllUserSubmissionQuery,
  MapSortType,
  MapSortTypeName
} from '@momentum/constants';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import { EMPTY, merge, of, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MultiSelectModule } from 'primeng/multiselect';
import { MapListComponent } from '../../../components/map-list/map-list.component';
import { LocalUserService } from '../../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CardComponent } from '../../../components/card/card.component';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { RouterLink } from '@angular/router';
import { DropdownComponent } from '../../../components/dropdown/dropdown.component';

type StatusFilters = Array<
  // | MapStatus.APPROVED // TODO: Need to support this on the backend
  | MapStatus.PUBLIC_TESTING
  | MapStatus.PRIVATE_TESTING
  | MapStatus.CONTENT_APPROVAL
  | MapStatus.FINAL_APPROVAL
>;

@Component({
  templateUrl: 'user-maps-browser.component.html',
  imports: [
    MapListComponent,
    MultiSelectModule,
    CardComponent,
    SpinnerDirective,
    RouterLink,
    ReactiveFormsModule,
    DropdownComponent,
    FormsModule
  ]
})
export class UserMapsBrowserComponent implements OnInit {
  private readonly localUserService = inject(LocalUserService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly MapStatusName = MapStatusName;
  protected readonly StatusDropdown = [
    { type: MapStatus.PRIVATE_TESTING, label: 'Private Testing' },
    { type: MapStatus.CONTENT_APPROVAL, label: 'Content Approval' },
    { type: MapStatus.PUBLIC_TESTING, label: 'Public Testing' },
    { type: MapStatus.FINAL_APPROVAL, label: 'Final Approval' }
  ];

  protected readonly MapSortType = MapSortType;
  protected readonly MapSortNameFn = (type: MapSortType): string =>
    MapSortTypeName.get(type);
  protected readonly MapSortOptions = [
    MapSortType.SUBMISSION_CREATED_NEWEST,
    MapSortType.SUBMISSION_CREATED_OLDEST,
    MapSortType.SUBMISSION_UPDATED_NEWEST,
    MapSortType.SUBMISSION_UPDATED_OLDEST,
    MapSortType.DATE_CREATED_NEWEST,
    MapSortType.DATE_CREATED_OLDEST,
    MapSortType.ALPHABETICAL,
    MapSortType.REVERSE_ALPHABETICAL
  ];

  protected hasSubmissionBan = false;

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    status: new FormControl<StatusFilters>(null),
    sortType: new FormControl<MapSortType>(MapSortType.DATE_RELEASED_NEWEST)
  });

  protected maps: MMap[] = [];
  protected summary: MapSummary[];
  protected summaryLoading = true;

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  async ngOnInit() {
    if (this.localUserService.hasBan(Ban.MAP_SUBMISSION)) {
      this.hasSubmissionBan = true;
      return;
    }

    this.localUserService.getSubmittedMapSummary().subscribe((res) => {
      this.summaryLoading = false;
      this.summary = res;
    });

    merge(
      of(this.initialItems),
      this.loadMore.pipe(
        filter(() => !this.loading),
        map(() => this.itemsPerLoad)
      ),
      this.filters?.valueChanges.pipe(
        debounceTime(200),
        tap(() => {
          this.maps = [];
          this.skip = 0;
        }),
        map(() => this.initialItems)
      ) ?? EMPTY
    )
      .pipe(
        filter(() => !this.filters || this.filters?.valid),
        tap(() => (this.loading = true)),
        switchMap((take) => {
          const { name, status, sortType } = this.filters?.value ?? {};
          const options: MapsGetAllUserSubmissionQuery = {
            skip: this.skip,
            take,
            expand: ['info', 'credits', 'leaderboards', 'submitter']
          };
          if (name) options.search = name;
          if (status?.length > 0)
            options.filter = status as StatusFilters as any; // TODO: Same bullshit as submission paeg
          if (sortType) options.sortType = sortType;

          return this.localUserService.getSubmittedMaps({ ...options });
        }),
        tap(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: PagedResponse<MMap>) => {
          this.maps.push(...res.data);
          this.skip += res.returnCount;
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching maps!',
            detail: httpError.error.message
          });
        }
      });
  }
}
