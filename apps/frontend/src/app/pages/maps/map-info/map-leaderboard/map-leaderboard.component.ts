import { Component, DestroyRef, Input, OnChanges } from '@angular/core';
import {
  GamemodeInfo,
  LeaderboardRun,
  LeaderboardType,
  MapLeaderboardGetQuery,
  MapStatus,
  MMap,
  PagedResponse,
  TrackType
} from '@momentum/constants';
import { mapHttpError } from '../../../../util/rxjs/map-http-error';
import { Observable, Subject, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { SharedModule } from '../../../../shared.module';
import {
  GroupedMapLeaderboard,
  GroupedMapLeaderboards,
  groupMapLeaderboards
} from '../../../../util';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HiddenLeaderboardsInfoComponent } from '../../../../components/tooltips/hidden-leaderboards-info.component';
import { UnrankedLeaderboardsInfoComponent } from '../../../../components/tooltips/unranked-leaderboards-info.component';

import { SpinnerComponent } from '../../../../components/spinner/spinner.component';
import { SpinnerDirective } from '../../../../directives/spinner.directive';
import { UserComponent } from '../../../../components/user/user.component';
import { LeaderboardsService } from '../../../../services/data/leaderboards.service';

enum LeaderboardFilterType {
  TOP10 = 1,
  AROUND = 2,
  FRIENDS = 3
}

export interface ActiveTrack {
  type: TrackType;
  num: number;
}

@Component({
  selector: 'm-map-leaderboard',
  templateUrl: 'map-leaderboard.component.html',
  standalone: true,
  imports: [
    SharedModule,
    DropdownModule,
    SpinnerComponent,
    SpinnerDirective,
    UserComponent,
    HiddenLeaderboardsInfoComponent,
    UnrankedLeaderboardsInfoComponent
  ]
})
export class MapLeaderboardComponent implements OnChanges {
  protected readonly MapStatus = MapStatus;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly TrackType = TrackType;
  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly floor = Math.floor;
  protected readonly LeaderboardFilterTypeDropdown = [
    { label: 'Top 10', type: LeaderboardFilterType.TOP10 },
    { label: 'Around', type: LeaderboardFilterType.AROUND },
    { label: 'Friend', type: LeaderboardFilterType.FRIENDS }
  ];

  @Input() map: MMap;
  protected leaderboards: GroupedMapLeaderboards;
  protected activeMode: GroupedMapLeaderboard;
  protected activeModeIndex: number;
  protected activeTrack: ActiveTrack = { type: TrackType.MAIN, num: 0 };
  // This is going to get *heavily* refactored in the future when we add
  // support for scrolling, jump-tos, and filtering. For now it's just in sync
  // with the game version. We'll do fancier stuff at 0.11.0.
  protected activeType: LeaderboardFilterType;

  protected runs: LeaderboardRun[] = [];
  protected readonly load = new Subject<void>();
  protected loading = false;

  protected showHiddenLeaderboards = false;

  selectMode(modeIndex: number) {
    this.activeModeIndex = modeIndex;
    this.activeMode = this.leaderboards[modeIndex];
    this.load.next();
  }

  selectTrack(type: TrackType, num: number) {
    this.activeTrack.type = type;
    this.activeTrack.num = num;
    this.load.next();
  }

  constructor(
    private readonly leaderboardService: LeaderboardsService,
    private readonly messageService: MessageService,
    private readonly destroyRef: DestroyRef
  ) {
    this.load
      .pipe(
        map(() =>
          JSON.stringify([this.activeMode, this.activeTrack, this.activeType])
        ),
        distinctUntilChanged(),
        tap(() => (this.loading = true)),
        switchMap(() => this.fetchRuns()),
        tap(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.runs = response.data;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            detail: error.message,
            summary: 'Error fetching runs'
          })
      });
  }

  ngOnChanges(): void {
    if (!this.map) return;

    this.leaderboards = groupMapLeaderboards(this.map.leaderboards);
    this.activeMode = this.leaderboards[0];
    this.activeModeIndex = 0;
    this.activeType = LeaderboardFilterType.TOP10;
    this.activeTrack.type = TrackType.MAIN;
    this.activeTrack.num = 1;

    this.load.next();
  }

  fetchRuns(): Observable<PagedResponse<LeaderboardRun>> {
    const { gamemode } = this.activeMode;
    const query: MapLeaderboardGetQuery = {
      gamemode,
      take: 10,
      trackType: this.activeTrack.type,
      trackNum: this.activeTrack.num
    };

    if (this.activeType === LeaderboardFilterType.FRIENDS)
      query.filter = 'friends';
    if (this.activeType === LeaderboardFilterType.AROUND)
      query.filter = 'around';

    return this.leaderboardService
      .getRuns(this.map.id, query)
      .pipe(mapHttpError(410, { data: [], totalCount: 0, returnCount: 0 }));
  }

  getLeaderboards() {
    return this.showHiddenLeaderboards
      ? this.leaderboards
      : this.leaderboards.filter(({ allHidden }) => !allHidden);
  }

  hasHiddenLeaderboards() {
    return this.leaderboards.some(
      ({ type }) => type === LeaderboardType.HIDDEN
    );
  }
}
