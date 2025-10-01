import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  MapCreditName,
  MapCreditType,
  MapsGetAllAdminFilter,
  MapsGetAllAdminQuery,
  MapSortType,
  MapSortTypeName,
  MapStatusName,
  MapStatus,
  MMap,
  PagedResponse,
  User
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
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
import { AdminService } from '../../../services/data/admin.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DropdownComponent } from '../../../components/dropdown/dropdown.component';
import { IconComponent } from '../../../icons/icon.component';
import { setupPersistentForm } from '../../../util/form-utils.util';

@Component({
  templateUrl: 'admin-maps-browser.component.html',
  imports: [
    MapListComponent,
    MultiSelectModule,
    UserSelectComponent,
    ReactiveFormsModule,
    DropdownComponent,
    FormsModule,
    IconComponent
  ]
})
export class AdminMapsBrowserComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // Set value as if submitter was last entry in MapCredit enum.
  protected readonly submitterCreditValue =
    Enum.fastLengthNumeric(MapCreditType);
  protected readonly MapCreditOptions = [
    ...Enum.fastValuesNumeric(MapCreditType),
    this.submitterCreditValue
  ];
  protected readonly MapCreditNameFn = (creditType: MapCreditType): string => {
    if (creditType === this.submitterCreditValue) {
      return 'Submitter';
    } else {
      return MapCreditName.get(creditType) ?? '';
    }
  };

  protected readonly MapSortOptions = [
    MapSortType.DATE_RELEASED_NEWEST,
    MapSortType.DATE_RELEASED_OLDEST,
    MapSortType.DATE_CREATED_NEWEST,
    MapSortType.DATE_CREATED_OLDEST,
    MapSortType.ALPHABETICAL,
    MapSortType.ALPHABETICAL_REVERSE,
    MapSortType.SUBMISSION_CREATED_NEWEST,
    MapSortType.SUBMISSION_CREATED_OLDEST,
    MapSortType.SUBMISSION_UPDATED_NEWEST,
    MapSortType.SUBMISSION_UPDATED_OLDEST
  ];
  protected readonly MapSortNameFn = (type: MapSortType): string =>
    MapSortTypeName.get(type);

  protected readonly MapStatusName = MapStatusName;
  protected readonly StatusDropdown = Enum.values(MapStatus).map(
    (status: MapStatus) => ({
      type: status,
      label: MapStatusName.get(status)
    })
  );

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    status: new FormControl<MapsGetAllAdminFilter>([], { nonNullable: true }),
    credit: new FormControl<User | null>(null),
    creditType: new FormControl<number>(MapCreditType.AUTHOR),
    sortType: new FormControl<MapSortType>(this.MapSortOptions[0])
  });

  protected maps: MMap[] = [];

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  ngOnInit() {
    setupPersistentForm(this.filters, 'ADMIN_MAPS_FILTERS', this.destroyRef);

    merge(
      of(this.initialItems),
      this.loadMore.pipe(
        filter(() => !this.loading),
        map(() => this.itemsPerLoad)
      ),
      this.filters.valueChanges.pipe(
        debounceTime(200),
        tap(() => {
          this.maps = [];
          this.skip = 0;
        }),
        map(() => this.initialItems)
      ) ?? EMPTY
    )
      .pipe(
        filter(() => this.filters.valid),
        tap(() => (this.loading = true)),
        switchMap((take) => {
          const { name, status, credit, creditType, sortType } =
            this.filters.getRawValue();

          const options: MapsGetAllAdminQuery = {
            skip: this.skip,
            take
          };
          if (name) options.search = name;
          if (status.length > 0) options.filter = status;
          if (credit) {
            if (creditType === this.submitterCreditValue) {
              options.submitterID = credit.id;
            } else {
              options.creditID = credit.id;
              options.creditType = creditType;
            }
          }
          if (sortType) options.sortType = sortType;

          return this.adminService.getMaps({ ...options });
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
      status: [],
      credit: null,
      creditType: MapCreditType.AUTHOR,
      sortType: this.MapSortOptions[0]
    });
  }
}
