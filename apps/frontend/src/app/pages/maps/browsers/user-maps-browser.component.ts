import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  Ban,
  MapCreditName,
  MapCreditType,
  MapsGetAllUserSubmissionQuery,
  MapStatus,
  MapStatusName,
  MapSummary,
  MapSortType,
  MapSortTypeName,
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
import { LocalUserService } from '../../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CardComponent } from '../../../components/card/card.component';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { RouterLink } from '@angular/router';
import { DropdownComponent } from '../../../components/dropdown/dropdown.component';
import { IconComponent } from '../../../icons';
import { setupPersistentForm } from '../../../util/form-utils.util';
import { fastValuesNumeric } from '@momentum/enum';

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
    UserSelectComponent,
    CardComponent,
    SpinnerDirective,
    RouterLink,
    ReactiveFormsModule,
    DropdownComponent,
    FormsModule,
    IconComponent
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

  protected readonly MapCreditOptions = fastValuesNumeric(MapCreditType);
  protected readonly MapCreditNameFn = (creditType: MapCreditType): string =>
    MapCreditName.get(creditType) ?? '';

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
  protected readonly MapSortNameFn = (type: MapSortType): string =>
    MapSortTypeName.get(type);

  protected hasSubmissionBan = false;

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    status: new FormControl<StatusFilters>(null),
    credit: new FormControl<User | null>(null),
    creditType: new FormControl<MapCreditType>(MapCreditType.AUTHOR),
    sortType: new FormControl<MapSortType>(this.MapSortOptions[0])
  });

  protected maps: MMap[] = [];
  protected summary: MapSummary[];
  protected summaryLoading = true;

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  ngOnInit() {
    if (this.localUserService.hasBan(Ban.MAP_SUBMISSION)) {
      this.hasSubmissionBan = true;
      return;
    }

    setupPersistentForm(this.filters, 'USER_MAPS_FILTERS', this.destroyRef);

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
          const { name, status, credit, creditType, sortType } =
            this.filters?.value ?? {};
          const options: MapsGetAllUserSubmissionQuery = {
            skip: this.skip,
            take,
            expand: ['info', 'credits', 'leaderboards', 'submitter']
          };
          if (name) options.search = name;
          if (status?.length > 0)
            options.filter = status as StatusFilters as any; // TODO: Same bullshit as submission paeg
          if (credit) {
            options.creditID = credit.id;
            options.creditType = creditType;
          }
          if (sortType) options.sortType = sortType;

          return this.localUserService.getSubmittedMaps({ ...options });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: PagedResponse<MMap>) => {
          this.maps.push(...res.data);
          this.skip += res.returnCount;
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

  resetFilters() {
    this.filters.reset({
      name: '',
      status: null,
      credit: null,
      creditType: MapCreditType.AUTHOR,
      sortType: this.MapSortOptions[0]
    });
  }
}
