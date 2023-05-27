import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { NbToastrService } from '@nebular/theme';
import { PagedResponse, Rank, Run } from '@momentum/types';
import { RanksService } from '@momentum/frontend/data';
import { Observable } from 'rxjs';

export enum LeaderboardType {
  TOP10 = 1,
  AROUND = 2,
  FRIENDS = 3
}

@Component({
  selector: 'mom-map-leaderboard',
  templateUrl: './map-leaderboard.component.html',
  styleUrls: ['./map-leaderboard.component.scss']
})
export class MapLeaderboardComponent {
  private mapID: number;
  @Input()
  set setMapID(value: number) {
    this.mapID = value;
    this.loadLeaderboardRuns();
  }

  filterActive: boolean;
  leaderboardRanks: Rank[];
  searchedRanks: boolean;
  protected readonly LeaderboardType = LeaderboardType;
  filterLeaderboardType: LeaderboardType;

  constructor(
    private rankService: RanksService,
    private router: Router,
    private toasterService: NbToastrService
  ) {
    this.filterActive = false;
    this.searchedRanks = false;
    this.leaderboardRanks = [];
    this.LeaderboardType = LeaderboardType;
    this.filterLeaderboardType = LeaderboardType.TOP10;
  }

  filterLeaderboardRuns(
    mapID?: number
  ): Observable<PagedResponse<Rank> | Rank[]> {
    switch (this.filterLeaderboardType) {
      case this.LeaderboardType.TOP10:
        return this.rankService.getRanks(mapID || this.mapID, {
          // TODO do further filtering here
          take: 10
        });

      case this.LeaderboardType.AROUND:
        return this.rankService.getAroundRanks(mapID || this.mapID);

      case this.LeaderboardType.FRIENDS:
        return this.rankService.getFriendsRanks(mapID || this.mapID);

      // No default
    }
  }

  loadLeaderboardRuns() {
    this.searchedRanks = false;
    this.filterLeaderboardRuns(this.mapID)
      .pipe(finalize(() => (this.searchedRanks = true)))
      .subscribe({
        next: (response) => {
          if (!Array.isArray(response))
            this.leaderboardRanks = response.response;
        },
        error: (error) =>
          this.toasterService.danger(error.message, 'Could not find runs')
      });
  }

  viewRun(run: Run) {
    this.router.navigate(['/dashboard/runs/' + run.id]);
  }
}
