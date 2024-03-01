import { Component, DestroyRef, OnInit } from '@angular/core';
import {
  Ban,
  MapsGetAllSubmissionQuery,
  MapStatusNameNew,
  MapStatusNew,
  MapSummary,
  MMap,
  PagedResponse
} from '@momentum/constants';
import { FormControl, FormGroup } from '@angular/forms';
import { SharedModule } from '../../../shared.module';
import { MapListComponent } from '../../../components';
import { EMPTY, merge, of, Subject } from 'rxjs';
import { LocalUserService } from '../../../services';
import { MessageService } from 'primeng/api';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MultiSelectModule } from 'primeng/multiselect';
import { SpinnerDirective } from '../../../directives';

type StatusFilters = Array<
  // | MapStatusNew.APPROVED // TODO: Need to support this on the backend
  | MapStatusNew.PUBLIC_TESTING
  | MapStatusNew.PRIVATE_TESTING
  | MapStatusNew.CONTENT_APPROVAL
  | MapStatusNew.FINAL_APPROVAL
>;

@Component({
  templateUrl: 'user-maps-browser.component.html',
  standalone: true,
  imports: [SharedModule, MapListComponent, MultiSelectModule, SpinnerDirective]
})
export class UserMapsBrowserComponent implements OnInit {
  protected readonly MapStatusName = MapStatusNameNew;
  protected readonly StatusDropdown = [
    { type: MapStatusNew.PRIVATE_TESTING, label: 'Private Testing' },
    { type: MapStatusNew.CONTENT_APPROVAL, label: 'Content Approval' },
    { type: MapStatusNew.PUBLIC_TESTING, label: 'Public Testing' },
    { type: MapStatusNew.FINAL_APPROVAL, label: 'Final Approval' }
  ];

  protected hasSubmissionBan = false;

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    status: new FormControl<StatusFilters>(null)
  });

  protected maps: MMap[] = [];
  protected summary: MapSummary[];
  protected summaryLoading = true;

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService,
    private readonly destroyRef: DestroyRef
  ) {}

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
          const { name, status } = this.filters?.value ?? {};
          const options: MapsGetAllSubmissionQuery = {
            skip: this.skip,
            take,
            expand: ['info', 'credits', 'leaderboards', 'submitter']
          };
          if (name) options.search = name;
          if (status?.length > 0)
            options.filter = status as StatusFilters as any; // TODO: Same bullshit as submission paeg

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
