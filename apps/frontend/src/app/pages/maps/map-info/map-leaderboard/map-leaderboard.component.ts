import { Component, DestroyRef, Input, OnChanges, inject } from '@angular/core';
import {
  GamemodeDefaultUIStyle,
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
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AngleDoubleLeftIcon, AngleDoubleRightIcon } from 'primeng/icons';
import {
  getRankGroupEnds,
  RANK_GROUP_COUNT,
  RANK_GROUP_TOP_RANKS
} from '@momentum/constants';
import { DialogService } from 'primeng/dynamicdialog';
import {
  GroupedMapLeaderboard,
  GroupedMapLeaderboards,
  findMainGamemodeIndex,
  groupMapLeaderboards
} from '../../../../util';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HiddenLeaderboardsInfoComponent } from '../../../../components/tooltips/hidden-leaderboards-info.component';
import { UnrankedLeaderboardsInfoComponent } from '../../../../components/tooltips/unranked-leaderboards-info.component';
import { SpinnerDirective } from '../../../../directives/spinner.directive';
import { UserComponent } from '../../../../components/user/user.component';
import { LeaderboardsService } from '../../../../services/data/leaderboards.service';
import { TooltipDirective } from '../../../../directives/tooltip.directive';
import { IconComponent } from '../../../../icons';
import { AsyncPipe, NgClass, NgStyle } from '@angular/common';
import { RangePipe } from '../../../../pipes/range.pipe';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { TimingPipe } from '../../../../pipes/timing.pipe';
import { TimeAgoPipe } from '../../../../pipes/time-ago.pipe';
import { NumberWithCommasPipe } from '../../../../pipes/number-with-commas.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { LocalUserService } from '../../../../services/data/local-user.service';
import { AdminService } from '../../../../services/data/admin.service';
import {
  ConfirmWithReasonDialogComponent,
  ConfirmWithReasonDialogResult
} from '../../../../components/dialogs/confirm-with-reason-dialog.component';

enum LeaderboardFilterType {
  TOP10 = 1,
  AROUND = 2,
  FRIENDS = 3
}

interface GroupBoundary {
  label: string;
  /** First rank of the section. */
  rank: number;
}

export interface ActiveTrack {
  type: TrackType;
  num: number;
}

@Component({
  selector: 'm-map-leaderboard',
  templateUrl: 'map-leaderboard.component.html',
  imports: [
    SelectModule,
    PaginatorModule,
    AngleDoubleLeftIcon,
    AngleDoubleRightIcon,
    SpinnerDirective,
    UserComponent,
    HiddenLeaderboardsInfoComponent,
    UnrankedLeaderboardsInfoComponent,
    TooltipDirective,
    IconComponent,
    NgClass,
    NgStyle,
    AsyncPipe,
    RangePipe,
    Select,
    FormsModule,
    TimingPipe,
    TimeAgoPipe,
    NumberWithCommasPipe
  ]
})
export class MapLeaderboardComponent implements OnChanges {
  private readonly leaderboardService = inject(LeaderboardsService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminService = inject(AdminService);
  protected readonly localUserService = inject(LocalUserService);
  private readonly dialogService = inject(DialogService);

  protected readonly MapStatus = MapStatus;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly TrackType = TrackType;
  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly floor = Math.floor;
  protected readonly LeaderboardFilterTypeDropdown = [
    { label: 'Top', type: LeaderboardFilterType.TOP10 },
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
  protected totalCount = 0;
  protected skip = 0;
  protected readonly take = 10;

  /** Set by "Jump to me" so the next load scrolls to the user's row. */
  private scrollToSelfAfterLoad = false;

  /** "Around" is a fixed window centred on the user, so it isn't paged. */
  protected get isPaged(): boolean {
    return this.activeType !== LeaderboardFilterType.AROUND;
  }

  /** Whether the current leaderboard awards rank points. */
  protected get hasPoints(): boolean {
    return this.runs.some((run) => run.points != null);
  }
  protected readonly load = new Subject<void>();
  protected loading = false;

  protected showHiddenLeaderboards = false;

  updateTags() {
    this.activeTags =
      (this.activeTrack.type === TrackType.BONUS
        ? this.activeMode.bonuses?.find(
            ({ num }) => num === this.activeTrack.num
          )?.tags
        : this.activeMode.tags) ?? [];
  }

  selectMode(modeIndex: number) {
    this.activeModeIndex = modeIndex;
    this.activeMode = this.leaderboards[modeIndex];
    this.activeStyle = this.groupStyle(this.activeMode);

    this.updateTags();
    this.reload();
  }

  selectTrack(type: TrackType, num: number) {
    this.activeTrack.type = type;
    this.activeTrack.num = num;
    this.updateTags();
    this.reload();
  }

  selectStyle(style: Style) {
    this.activeStyle = style;
    this.reload();
  }

  /** Load the first page, e.g. after switching leaderboard or filter. */
  reload() {
    this.skip = 0;
    this.load.next();
  }

  /**
   * Go to the page of the full leaderboard containing the user's run, then
   * scroll to it.
   */
  protected jumpToSelf(): void {
    const userID = this.localUserService.user.value?.id;
    if (!userID) return;

    this.leaderboardService
      .getRun(this.map.id, {
        gamemode: this.activeMode.gamemode,
        trackType: this.activeTrack.type,
        trackNum: this.activeTrack.num,
        style: this.activeStyle,
        userID
      })
      .subscribe({
        next: ({ rank }) => {
          this.activeType = LeaderboardFilterType.TOP10;
          this.skip = Math.floor((rank - 1) / this.take) * this.take;
          this.scrollToSelfAfterLoad = true;
          this.load.next();
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add(
            httpError.status === 404
              ? {
                  severity: 'info',
                  summary: "You don't have a run on this leaderboard"
                }
              : {
                  severity: 'error',
                  summary: 'Error finding your run',
                  detail: httpError.error?.message
                }
          )
      });
  }

  protected isLocalUser(run: LeaderboardRun): boolean {
    return this.localUserService.user.value?.id === run.userID;
  }

  protected onPageChange(event: PaginatorState): void {
    if (event.first === this.skip) return;
    this.skip = event.first;
    this.load.next();
  }

  /**
   * Whether the paginator's double arrows jump between rank group boundaries
   * rather than to the first/last page. Not with the friends filter, whose
   * total count is only the friends rather than the whole board.
   */
  protected get jumpsByGroup(): boolean {
    return this.activeType !== LeaderboardFilterType.FRIENDS;
  }

  /**
   * Where each section of the board starts: the top 10, each rank group, and
   * the runs past the last group. Only sections that start on different
   * pages, and that exist on this board.
   */
  private get groupBoundaries(): GroupBoundary[] {
    const boundaries: GroupBoundary[] = [{ label: 'Top 10', rank: 1 }];
    const ends = getRankGroupEnds(this.totalCount);
    for (let group = 1; group <= RANK_GROUP_COUNT; group++) {
      boundaries.push({
        label: `Group ${group}`,
        rank: group === 1 ? RANK_GROUP_TOP_RANKS + 1 : ends[group - 2] + 1
      });
    }
    boundaries.push({
      label: `ranks past Group ${RANK_GROUP_COUNT}`,
      rank: ends.at(-1) + 1
    });

    return boundaries.filter(
      ({ rank }, i) =>
        rank <= this.totalCount &&
        (i === 0 || this.pageOf(rank) !== this.pageOf(boundaries[i - 1].rank))
    );
  }

  /**
   * The next boundary on a later page. Past the last boundary, the last run
   * on the board, so the end is still reachable.
   */
  protected get nextGroupBoundary(): GroupBoundary | null {
    const page = this.pageOf(this.skip + 1);
    const next = this.groupBoundaries.find(
      ({ rank }) => this.pageOf(rank) > page
    );
    if (next) return next;
    if (this.pageOf(this.totalCount) > page)
      return { label: 'last place', rank: this.totalCount };
    return null;
  }

  /**
   * The nearest boundary on an earlier page: the start of the current section,
   * or of the previous one if already on the current section's first page.
   */
  protected get previousGroupBoundary(): GroupBoundary | null {
    const page = this.pageOf(this.skip + 1);
    return (
      this.groupBoundaries.findLast(({ rank }) => this.pageOf(rank) < page) ??
      null
    );
  }

  protected jumpToRank(rank: number): void {
    this.onPageChange({ first: (this.pageOf(rank) - 1) * this.take });
  }

  protected get pageReport(): string {
    return `${this.pageOf(this.skip + 1)} of ${this.pageOf(this.totalCount)}`;
  }

  /** 1-based page containing a rank. */
  private pageOf(rank: number): number {
    return Math.max(1, Math.ceil(rank / this.take));
  }

  constructor() {
    this.load
      .pipe(
        map(() =>
          JSON.stringify([
            this.activeMode,
            this.activeTrack,
            this.activeType,
            this.activeStyle,
            this.skip
          ])
        ),
        tap(() => (this.loading = true)),
        switchMap(() => this.fetchRuns()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.runs = response.data;
          this.totalCount = response.totalCount;
          this.loading = false;

          if (this.scrollToSelfAfterLoad) {
            this.scrollToSelfAfterLoad = false;
            // Wait a tick for the rows to render.
            setTimeout(() =>
              document
                .getElementById('leaderboard-run-self')
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            );
          }
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
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
    this.leaderboards.forEach((lb) =>
      lb.bonuses?.sort((a, b) => a.num - b.num)
    );
    this.activeModeIndex = findMainGamemodeIndex(
      this.leaderboards,
      this.map.name
    );
    this.activeMode = this.leaderboards[this.activeModeIndex];
    this.activeType = LeaderboardFilterType.TOP10;
    this.activeTrack.type = TrackType.MAIN;
    this.activeTrack.num = 1;
    this.activeStyle = this.groupStyle(this.activeMode);
    this.activeTags = this.activeMode.tags ?? [];

    this.reload();
  }

  private groupStyle(group: GroupedMapLeaderboard): Style {
    return (
      group.style ?? GamemodeDefaultUIStyle.get(group.gamemode) ?? Style.NORMAL
    );
  }

  fetchRuns(): Observable<PagedResponse<LeaderboardRun>> {
    const { gamemode } = this.activeMode;
    const query: MapLeaderboardGetQuery = {
      gamemode,
      take: this.take,
      ...(this.isPaged && { skip: this.skip }),
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

  get isModOrAdmin() {
    return this.localUserService.isMod || this.localUserService.isAdmin;
  }

  deleteRun(run: LeaderboardRun) {
    this.dialogService
      .open(ConfirmWithReasonDialogComponent, {
        header: 'Delete run',
        data: {
          message: `Are you sure you want to permanently delete this run by ${run.user.alias}?`,
          proceedMessage: 'Delete run',
          abortMessage: 'Cancel'
        }
      })
      .onClose.subscribe(
        ({ confirmed, reason }: ConfirmWithReasonDialogResult) => {
          if (!confirmed) return;

          this.adminService.deleteRun(run, reason).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                detail: 'Run deleted',
                summary: 'Success'
              });
              this.load.next();
            },
            error: (httpError: HttpErrorResponse) => {
              this.messageService.add({
                severity: 'error',
                detail: httpError.error.message,
                summary: 'Error deleting run'
              });
            }
          });
        }
      );
  }
}
