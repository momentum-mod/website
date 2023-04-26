import { Component, Input } from '@angular/core';
import { Run } from '../../../../../@core/models/run.model';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RanksService } from '../../../../../@core/data/ranks.service';
import { UserMapRank } from '../../../../../@core/models/user-map-rank.model';
import { NbToastrService } from '@nebular/theme';

export enum LeaderboardType {
  TOP10 = 1,
  AROUND = 2,
  FRIENDS = 3
}

@Component({
  selector: 'map-leaderboard',
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
  leaderboardRanks: UserMapRank[];
  searchedRanks: boolean;
  protected readonly LeaderboardTypeEnum = LeaderboardType;
  filterLeaderboardType: LeaderboardType;

  constructor(
    private rankService: RanksService,
    private router: Router,
    private toasterService: NbToastrService
  ) {
    this.filterActive = false;
    this.searchedRanks = false;
    this.leaderboardRanks = [];
    this.LeaderboardTypeEnum = LeaderboardType;
    this.filterLeaderboardType = LeaderboardType.TOP10;
  }

  filterLeaderboardRuns(mapID?: number) {
    switch (this.filterLeaderboardType) {
      case this.LeaderboardTypeEnum.TOP10: {
        return this.rankService.getRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10
          }
        });
      }
      case this.LeaderboardTypeEnum.AROUND: {
        return this.rankService.getAroundRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10
          }
        });
      }
      case this.LeaderboardTypeEnum.FRIENDS: {
        return this.rankService.getFriendsRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10
          }
        });
      }
      // No default
    }
  }

  loadLeaderboardRuns() {
    this.searchedRanks = false;
    this.filterLeaderboardRuns(this.mapID)
      .pipe(finalize(() => (this.searchedRanks = true)))
      .subscribe(
        (res) => {
          if (res.count) this.leaderboardRanks = res.ranks;
        },
        (err) => {
          this.toasterService.danger(err.message, 'Could not find runs');
        }
      );
  }

  viewRun(run: Run) {
    this.router.navigate(['/dashboard/runs/' + run.id]);
  }
}
