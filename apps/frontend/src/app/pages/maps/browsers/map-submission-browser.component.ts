import { Component, DestroyRef, OnInit } from '@angular/core';
import {
  MapsGetAllSubmissionQuery,
  MapStatusNew,
  MMap,
  PagedResponse,
  User
} from '@momentum/constants';
import { FormControl, FormGroup } from '@angular/forms';
import { SharedModule } from '../../../shared.module';
import { MapListComponent } from '../../../components';
import { EMPTY, merge, of, Subject } from 'rxjs';
import { MapsService } from '../../../services';
import { MessageService } from 'primeng/api';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MultiSelectModule } from 'primeng/multiselect';
import { UserSelectComponent } from '../../../components/user-select/user-select.component';

type StatusFilters = Array<
  | MapStatusNew.PUBLIC_TESTING
  | MapStatusNew.PRIVATE_TESTING
  | MapStatusNew.CONTENT_APPROVAL
  | MapStatusNew.FINAL_APPROVAL
>;

// This component is very similar to the MapBrowserComponent, found it easier to
// split them up. Try to keep any styling synced up.
@Component({
  templateUrl: 'map-submission-browser.component.html',
  standalone: true,
  imports: [
    SharedModule,
    MapListComponent,
    MultiSelectModule,
    UserSelectComponent
  ]
})
export class MapSubmissionBrowserComponent implements OnInit {
  protected readonly StatusDropdown = [
    { type: MapStatusNew.PRIVATE_TESTING, label: 'Private Testing' },
    { type: MapStatusNew.CONTENT_APPROVAL, label: 'Content Approval' },
    { type: MapStatusNew.PUBLIC_TESTING, label: 'Public Testing' },
    { type: MapStatusNew.FINAL_APPROVAL, label: 'Final Approval' }
  ];

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    status: new FormControl<StatusFilters>(null),
    submitter: new FormControl<User>(null)
  });

  protected maps: MMap[] = [];

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  constructor(
    private readonly mapsService: MapsService,
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
          const { name, status, submitter } = this.filters?.value ?? {};
          const options: MapsGetAllSubmissionQuery = {
            skip: this.skip,
            take,
            expand: ['info', 'credits', 'leaderboards', 'submitter']
          };
          if (name) options.search = name;
          // TODO: Remove this `as any` once below endpoint supports all these
          // filters.
          if (status?.length > 0)
            options.filter = status as StatusFilters as any;
          if (submitter) {
            options.submitterID = submitter.id;
          }

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
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching maps!',
            detail: err.message
          });
        }
      });
  }
}
