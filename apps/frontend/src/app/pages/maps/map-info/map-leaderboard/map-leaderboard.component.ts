import {
  Component,
  DestroyRef,
  OnChanges,
  inject,
  input,
  signal
} from '@angular/core';
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
import { MessageService } from '@openng/optimus-ui/api';
import { SelectModule } from '@openng/optimus-ui/select';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
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
import { SpinnerComponent } from '../../../../components/spinner/spinner.component';
import { SpinnerDirective } from '../../../../directives/spinner.directive';
import { UserComponent } from '../../../../components/user/user.component';
import { LeaderboardsService } from '../../../../services/data/leaderboards.service';
import { TooltipDirective } from '../../../../directives/tooltip.directive';
import { IconComponent } from '../../../../icons';
import { NgClass, NgStyle } from '@angular/common';
import { RangePipe } from '../../../../pipes/range.pipe';
import { Select } from '@openng/optimus-ui/select';
import { FormsModule } from '@angular/forms';
import { TimingPipe } from '../../../../pipes/timing.pipe';
import { TimeAgoPipe } from '../../../../pipes/time-ago.pipe';
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

export interface ActiveTrack {
  type: TrackType;
  num: number;
}

@Component({
  selector: 'm-map-leaderboard',
  templateUrl: 'map-leaderboard.component.html',
  imports: [
    SelectModule,
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
  private readonly adminService = inject(AdminService);
  private readonly localUserService = inject(LocalUserService);
  private readonly dialogService = inject(DialogService);

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

  readonly map = input<MMap>();
  protected readonly leaderboards = signal<GroupedMapLeaderboards>([]);
  protected readonly activeMode = signal<GroupedMapLeaderboard | null>(null);
  protected readonly activeModeIndex = signal<number | null>(null);
  protected readonly activeTrack = signal<ActiveTrack>({
    type: TrackType.MAIN,
    num: 0
  });
  protected readonly activeStyle = signal<Style>(Style.NORMAL);
  // This is going to get *heavily* refactored in the future when we add
  // support for scrolling, jump-tos, and filtering. For now it's just in sync
  // with the game version. We'll do fancier stuff at 0.11.0.
  protected readonly activeType = signal<LeaderboardFilterType | null>(null);
  protected readonly activeTags = signal<MapTag[] | null>(null);

  protected readonly runs = signal<LeaderboardRun[]>([]);
  protected readonly load = new Subject<void>();
  protected readonly loading = signal(false);

  protected readonly showHiddenLeaderboards = signal(false);

  updateTags() {
    const activeTrack = this.activeTrack();
    const activeMode = this.activeMode();
    this.activeTags.set(
      activeTrack.type === TrackType.BONUS
        ? activeMode.bonuses.find(({ num }) => num === activeTrack.num)?.tags
        : activeMode.tags
    );
  }

  selectMode(modeIndex: number) {
    const mode = this.leaderboards()[modeIndex];
    this.activeModeIndex.set(modeIndex);
    this.activeMode.set(mode);
    this.activeStyle.set(
      GamemodeDefaultUIStyle.get(mode.gamemode) ?? Style.NORMAL
    );

    this.updateTags();
    this.load.next();
  }

  selectTrack(type: TrackType, num: number) {
    this.activeTrack.set({ type, num });
    this.updateTags();
    this.load.next();
  }

  selectStyle(style: Style) {
    this.activeStyle.set(style);
    this.load.next();
  }

  constructor() {
    this.load
      .pipe(
        map(() =>
          JSON.stringify([
            this.activeMode(),
            this.activeTrack(),
            this.activeType(),
            this.activeStyle()
          ])
        ),
        tap(() => this.loading.set(true)),
        switchMap(() => this.fetchRuns()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.runs.set(response.data);
          this.loading.set(false);
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
            summary: 'Error fetching runs'
          });
          this.loading.set(false);
        }
      });
  }

  ngOnChanges(): void {
    const mapValue = this.map();
    if (!mapValue) return;

    const leaderboards = groupMapLeaderboards(mapValue.leaderboards).sort(
      (a, b) => a.gamemodeName.localeCompare(b.gamemodeName)
    );
    leaderboards.forEach((lb) => lb.bonuses?.sort((a, b) => a.num - b.num));
    const activeModeIndex = findMainGamemodeIndex(leaderboards, mapValue.name);
    const activeMode = leaderboards[activeModeIndex];
    this.leaderboards.set(leaderboards);
    this.activeModeIndex.set(activeModeIndex);
    this.activeMode.set(activeMode);
    this.activeType.set(LeaderboardFilterType.TOP10);
    this.activeTrack.set({ type: TrackType.MAIN, num: 1 });
    this.activeStyle.set(
      GamemodeDefaultUIStyle.get(activeMode.gamemode) ?? Style.NORMAL
    );
    this.activeTags.set(activeMode.tags);

    this.load.next();
  }

  fetchRuns(): Observable<PagedResponse<LeaderboardRun>> {
    const { gamemode } = this.activeMode();
    const activeTrack = this.activeTrack();
    const query: MapLeaderboardGetQuery = {
      gamemode,
      take: 10,
      trackType: activeTrack.type,
      trackNum: activeTrack.num,
      style: this.activeStyle()
    };

    if (this.activeType() === LeaderboardFilterType.FRIENDS)
      query.filter = 'friends';
    if (this.activeType() === LeaderboardFilterType.AROUND)
      query.filter = 'around';

    return this.leaderboardService
      .getRuns(this.map().id, query)
      .pipe(mapHttpError(410, { data: [], totalCount: 0, returnCount: 0 }));
  }

  hasHiddenLeaderboards() {
    return this.leaderboards().some(
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
