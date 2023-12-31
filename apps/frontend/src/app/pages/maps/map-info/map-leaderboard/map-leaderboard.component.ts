import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  Gamemode,
  GamemodeName,
  LeaderboardRun,
  MMap,
  PagedResponse,
  TrackType
} from '@momentum/constants';
import { LeaderboardsService } from '../../../../services';
import { Observable } from 'rxjs';
import { SharedModule } from '../../../../shared.module';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { AvatarComponent } from '../../../../components';
import { TimeAgoPipe, TimingPipe } from '../../../../pipes';

enum LeaderboardType {
  TOP10,
  AROUND,
  FRIENDS
}

@Component({
  selector: 'm-map-leaderboard',
  templateUrl: './map-leaderboard.component.html',
  standalone: true,
  imports: [
    SharedModule,
    DropdownModule,
    AvatarComponent,
    TimingPipe,
    TimeAgoPipe
  ]
})
export class MapLeaderboardComponent {
  protected readonly LeaderboardType = LeaderboardType;

  private map: MMap;
  @Input()
  set setMap(map: MMap) {
    this.map = map;
    // Just handling main tracks for now - we should do stages, bonuses and
    // styles in the future.
    this.availableModes = map.leaderboards
      ?.filter(({ trackType }) => trackType === TrackType.MAIN)
      // Put ranked stuff at the front: if B is ranked and A isn't, put B first,
      // otherwise unchanged.
      .sort((a, b) => (b.ranked && !a.ranked ? 1 : 0))
      .map(({ gamemode }) => ({ gamemode, label: GamemodeName.get(gamemode) }));
    // TODO: This isn't getting updated in the template. But this page is throwing
    // ExpressionChangedAfterItHasBeenChecked errors out the wazzoo, fix that first.
    this.selectedMode = this.availableModes[0];
    this.loadLeaderboardRuns();
  }

  protected availableModes: Array<{ gamemode: Gamemode; label: string }>;
  protected selectedMode: { gamemode: Gamemode; label: string };
  protected filterActive = false;
  protected leaderboardRuns: LeaderboardRun[] = [];
  protected searchedRanks = false;
  protected filterLeaderboardType: LeaderboardType = LeaderboardType.TOP10;

  constructor(
    private readonly leaderboardService: LeaderboardsService,
    private readonly router: Router,
    private readonly messageService: MessageService
  ) {}

  filterLeaderboardRuns(
    gamemode: Gamemode,
    mapID?: number
  ): Observable<PagedResponse<LeaderboardRun>> {
    switch (this.filterLeaderboardType) {
      case this.LeaderboardType.TOP10:
        return this.leaderboardService.getRuns(mapID ?? this.map.id, {
          gamemode,
          take: 10
        });

      case this.LeaderboardType.AROUND:
        return this.leaderboardService.getAroundFriends(mapID ?? this.map.id, {
          gamemode
        });

      case this.LeaderboardType.FRIENDS:
        return this.leaderboardService.getFriendRuns(mapID ?? this.map.id, {
          gamemode
        });

      // No default
    }
  }

  loadLeaderboardRuns() {
    this.leaderboardRuns.map(({ rank }) => rank);
    this.searchedRanks = false;
    this.filterLeaderboardRuns(this.selectedMode.gamemode, this.map.id)
      .pipe(finalize(() => (this.searchedRanks = true)))
      .subscribe({
        next: (response) => {
          this.leaderboardRuns = response.data;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            detail: error.message,
            summary: 'Could not find runs'
          })
      });
  }

  viewRun(run: LeaderboardRun) {
    this.router.navigate(['/runs/' + run.pastRunID]);
  }
}
