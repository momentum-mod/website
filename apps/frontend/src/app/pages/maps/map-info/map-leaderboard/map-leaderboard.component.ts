import { Component, Input, OnChanges } from '@angular/core';
import {
  GamemodeIcon,
  LeaderboardRun,
  MapLeaderboardGetQuery,
  MMap,
  PagedResponse,
  TrackType
} from '@momentum/constants';
import { mapHttpError } from '@momentum/util-fn';
import { Observable, Subject, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { SharedModule } from '../../../../shared.module';
import { LeaderboardsService } from '../../../../services';
import {
  AvatarComponent,
  SpinnerComponent,
  UserComponent
} from '../../../../components';
import { TimeAgoPipe, TimingPipe } from '../../../../pipes';
import { GroupedMapLeaderboards, groupMapLeaderboards } from '../../../../util';
import { RangePipe } from '../../../../pipes/range.pipe';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { SpinnerDirective } from '../../../../directives';

enum LeaderboardType {
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
  styleUrl: 'map-leaderboard.component.css',
  standalone: true,
  imports: [
    SharedModule,
    DropdownModule,
    AvatarComponent,
    TimingPipe,
    TimeAgoPipe,
    RangePipe,
    SpinnerComponent,
    SpinnerDirective,
    UserComponent
  ]
})
export class MapLeaderboardComponent implements OnChanges {
  protected readonly TrackType = TrackType;
  protected readonly GamemodeIcon = GamemodeIcon;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly floor = Math.floor;
  protected readonly LeaderboardTypeDropdown = [
    { label: 'Top 10', type: LeaderboardType.TOP10 },
    { label: 'Around', type: LeaderboardType.AROUND },
    { label: 'Friend', type: LeaderboardType.FRIENDS }
  ];

  @Input() map: MMap;
  protected leaderboards: GroupedMapLeaderboards;
  protected activeMode: GroupedMapLeaderboards[number];
  protected activeModeIndex: number;
  protected activeTrack: ActiveTrack = { type: TrackType.MAIN, num: 0 };
  // This is going to get *heavily* refactored in the future when we add
  // support for scrolling, jump-tos, and filtering. For now it's just in sync
  // with the game version. We'll do fancier stuff at 0.11.0.
  protected activeType: LeaderboardType;

  protected runs: LeaderboardRun[] = [];
  protected readonly load = new Subject<void>();
  protected loading = false;

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
    private readonly messageService: MessageService
  ) {
    this.load
      .pipe(
        map(() =>
          JSON.stringify([this.activeMode, this.activeTrack, this.activeType])
        ),
        distinctUntilChanged(),
        tap(() => (this.loading = true)),
        switchMap(() => this.fetchRuns()),
        tap(() => (this.loading = false))
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
    this.activeType = LeaderboardType.TOP10;
    this.activeTrack.type = TrackType.MAIN;
    this.activeTrack.num = 0;

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

    if (this.activeType === LeaderboardType.FRIENDS) query.filter = 'friends';
    if (this.activeType === LeaderboardType.AROUND) query.filter = 'around';

    return this.leaderboardService
      .getRuns(this.map.id, query)
      .pipe(mapHttpError(410, { data: [], totalCount: 0, returnCount: 0 }));
  }
}
