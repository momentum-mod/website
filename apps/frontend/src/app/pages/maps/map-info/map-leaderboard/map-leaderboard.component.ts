import { Component, DestroyRef, Input, OnChanges, inject } from '@angular/core';
import {
  GamemodeInfo,
  LeaderboardRun,
  LeaderboardType,
  MapLeaderboardGetQuery,
  MapStatus,
  MapTag,
  mapTagEnglishName,
  MMap,
  PagedResponse,
  Style,
  styleEnglishName,
  TrackType
} from '@momentum/constants';
import { mapHttpError } from '../../../../util/rxjs/map-http-error';
import { Observable, Subject, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';

import {
  GroupedMapLeaderboard,
  GroupedMapLeaderboards,
  findMainGamemodeIndex,
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
import { TooltipDirective } from '../../../../directives/tooltip.directive';
import { IconComponent } from '../../../../icons';
import { NgClass, NgStyle } from '@angular/common';
import { RangePipe } from '../../../../pipes/range.pipe';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { TimingPipe } from '../../../../pipes/timing.pipe';
import { TimeAgoPipe } from '../../../../pipes/time-ago.pipe';

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
  imports: [
    DropdownModule,
    SpinnerComponent,
    SpinnerDirective,
    UserComponent,
    HiddenLeaderboardsInfoComponent,
    UnrankedLeaderboardsInfoComponent,
    TooltipDirective,
    IconComponent,
    NgClass,
    NgStyle,
    RangePipe,
    Select,
    FormsModule,
    TimingPipe,
    TimeAgoPipe
  ]
})
export class MapLeaderboardComponent implements OnChanges {
  private readonly leaderboardService = inject(LeaderboardsService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

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
  protected readonly mapTagEnglishName = mapTagEnglishName;
  protected readonly styleEnglishName = styleEnglishName;

  @Input() map: MMap;
  protected leaderboards: GroupedMapLeaderboards;
  protected activeMode: GroupedMapLeaderboard;
  protected activeModeIndex: number;
  protected activeTrack: ActiveTrack = { type: TrackType.MAIN, num: 0 };
  protected activeStyle: Style = Style.NORMAL;
  // This is going to get *heavily* refactored in the future when we add
  // support for scrolling, jump-tos, and filtering. For now it's just in sync
  // with the game version. We'll do fancier stuff at 0.11.0.
  protected activeType: LeaderboardFilterType;
  protected activeTags: MapTag[];

  protected runs: LeaderboardRun[] = [];
  protected readonly load = new Subject<void>();
  protected loading = false;

  protected showHiddenLeaderboards = false;

  updateTags() {
    this.activeTags =
      this.activeTrack.type === TrackType.BONUS
        ? this.activeMode.bonuses.find(
            ({ num }) => num === this.activeTrack.num
          )?.tags
        : this.activeMode.tags;
  }

  selectMode(modeIndex: number) {
    this.activeModeIndex = modeIndex;
    this.activeMode = this.leaderboards[modeIndex];
    this.updateTags();
    this.load.next();
  }

  selectTrack(type: TrackType, num: number) {
    this.activeTrack.type = type;
    this.activeTrack.num = num;
    this.updateTags();
    this.load.next();
  }

  selectStyle(style: Style) {
    this.activeStyle = style;
    this.load.next();
  }

  constructor() {
    this.load
      .pipe(
        map(() =>
          JSON.stringify([
            this.activeMode,
            this.activeTrack,
            this.activeType,
            this.activeStyle
          ])
        ),
        distinctUntilChanged(),
        tap(() => (this.loading = true)),
        switchMap(() => this.fetchRuns()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.runs = response.data;
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            detail: error.message,
            summary: 'Error fetching runs'
          });
          this.loading = false;
        }
      });
  }

  ngOnChanges(): void {
    if (!this.map) return;

    this.leaderboards = groupMapLeaderboards(this.map.leaderboards).sort(
      (a, b) => a.gamemodeName.localeCompare(b.gamemodeName)
    );
    this.activeModeIndex = findMainGamemodeIndex(
      this.leaderboards,
      this.map.name
    );
    this.activeMode = this.leaderboards[this.activeModeIndex];
    this.activeType = LeaderboardFilterType.TOP10;
    this.activeTrack.type = TrackType.MAIN;
    this.activeTrack.num = 1;
    this.activeStyle = Style.NORMAL;
    this.activeTags = this.activeMode.tags;

    this.load.next();
  }

  fetchRuns(): Observable<PagedResponse<LeaderboardRun>> {
    const { gamemode } = this.activeMode;
    const query: MapLeaderboardGetQuery = {
      gamemode,
      take: 10,
      trackType: this.activeTrack.type,
      trackNum: this.activeTrack.num,
      style: this.activeStyle
    };

    if (this.activeType === LeaderboardFilterType.FRIENDS)
      query.filter = 'friends';
    if (this.activeType === LeaderboardFilterType.AROUND)
      query.filter = 'around';

    return this.leaderboardService
      .getRuns(this.map.id, query)
      .pipe(mapHttpError(410, { data: [], totalCount: 0, returnCount: 0 }));
  }

  hasHiddenLeaderboards() {
    return this.leaderboards.some(
      ({ type }) => type === LeaderboardType.HIDDEN
    );
  }
}
