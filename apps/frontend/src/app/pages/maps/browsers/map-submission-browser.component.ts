import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  MapsGetAllSubmissionQuery,
  MapSortType,
  MapSortTypeName,
  MapStatus,
  MMap,
  PagedResponse,
  User
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
import { UserSelectComponent } from '../../../components/user-select/user-select.component';
import { MapListComponent } from '../../../components/map-list/map-list.component';
import { MapsService } from '../../../services/data/maps.service';
import { HttpErrorResponse } from '@angular/common/http';
import { IconComponent } from '../../../icons';
import { TooltipDirective } from '../../../directives/tooltip.directive';
import { DropdownComponent } from '../../../components/dropdown/dropdown.component';
import { setupPersistentForm } from '../../../util/form-utils.util';

type StatusFilters = Array<
  | MapStatus.PUBLIC_TESTING
  | MapStatus.PRIVATE_TESTING
  | MapStatus.CONTENT_APPROVAL
  | MapStatus.FINAL_APPROVAL
>;

// This component is very similar to the MapBrowserComponent, found it easier to
// split them up. Try to keep any styling synced up.
@Component({
  templateUrl: 'map-submission-browser.component.html',
  imports: [
    MapListComponent,
    MultiSelectModule,
    UserSelectComponent,
    IconComponent,
    TooltipDirective,
    ReactiveFormsModule,
    DropdownComponent,
    FormsModule
  ]
})
export class MapSubmissionBrowserComponent implements OnInit {
  private readonly mapsService = inject(MapsService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

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

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    status: new FormControl<StatusFilters>(null),
    submitter: new FormControl<User>(null),
    sortType: new FormControl<MapSortType>(this.MapSortOptions[0])
  });

  protected maps: MMap[] = [];

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  ngOnInit() {
    setupPersistentForm(
      this.filters,
      this.constructor.name + '_FILTERS',
      this.destroyRef
    );

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
          const { name, status, submitter, sortType } =
            this.filters?.value ?? {};
          const options: MapsGetAllSubmissionQuery = {
            skip: this.skip,
            take,
            expand: [
              'info',
              'credits',
              'leaderboards',
              'submitter',
              'inFavorites'
            ]
          };
          if (name) options.search = name;
          // TODO: Remove this `as any` once below endpoint supports all these
          // filters.
          if (status?.length > 0)
            options.filter = status as StatusFilters as any;
          if (submitter) {
            options.submitterID = submitter.id;
          }
          if (sortType) options.sortType = sortType;

          return this.mapsService.getMapSubmissions({ ...options });
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

  resetFilters() {
    this.filters.reset({
      name: '',
      status: null,
      submitter: null,
      sortType: this.MapSortOptions[0]
    });
  }
}
