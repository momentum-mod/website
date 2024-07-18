import { Component, DestroyRef, OnInit } from '@angular/core';
import {
  MapsGetAllAdminQuery,
  MapStatusName,
  MapStatus,
  MMap,
  PagedResponse
} from '@momentum/constants';
import { Enum } from '@momentum/enum';
import { FormControl, FormGroup } from '@angular/forms';
import { SharedModule } from '../../../shared.module';
import { EMPTY, merge, of, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MultiSelectModule } from 'primeng/multiselect';
import { MapListComponent } from '../../../components/map-list/map-list.component';
import { AdminService } from '../../../services/data/admin.service';
import { HttpErrorResponse } from '@angular/common/http';

type StatusFilters = Array<MapStatus>;

@Component({
  templateUrl: 'admin-maps-browser.component.html',
  standalone: true,
  imports: [SharedModule, MapListComponent, MultiSelectModule]
})
export class AdminMapsBrowserComponent implements OnInit {
  protected readonly MapStatusName = MapStatusName;
  protected readonly StatusDropdown = Enum.values(MapStatus).map(
    (status: MapStatus) => ({
      type: status,
      label: MapStatusName.get(status)
    })
  );

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    status: new FormControl<StatusFilters>(null)
  });

  protected maps: MMap[] = [];

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  constructor(
    private readonly adminService: AdminService,
    private readonly messageService: MessageService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit() {
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
          const { name, status } = this.filters?.value ?? {};
          const options: MapsGetAllAdminQuery = {
            skip: this.skip,
            take
          };
          if (name) options.search = name;
          if (status?.length > 0) options.filter = status as StatusFilters;

          return this.adminService.getMaps({ ...options });
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
