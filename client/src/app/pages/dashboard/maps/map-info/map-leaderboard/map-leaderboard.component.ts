import {Component, Input, OnInit} from '@angular/core';
import {Run} from '../../../../../@core/models/run.model';
import {Router} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {RanksService} from '../../../../../@core/data/ranks.service';
import {UserMapRank} from '../../../../../@core/models/user-map-rank.model';
import {NbToastrService} from '@nebular/theme';

@Component({
  selector: 'map-leaderboard',
  templateUrl: './map-leaderboard.component.html',
  styleUrls: ['./map-leaderboard.component.scss'],
})
export class MapLeaderboardComponent implements OnInit {

  private _mapID: number;
  @Input('mapID')
  set mapID(value: number) {
    this._mapID = value;
    this.loadLeaderboardRuns(this._mapID);
  }
  filterActive: boolean;
  leaderboardRanks: UserMapRank[];
  searchedRanks: boolean;
  filterOption: number;

  constructor(private rankService: RanksService,
              private router: Router,
              private toasterService: NbToastrService) {
    this.filterActive = false;
    this.searchedRanks = false;
    this.leaderboardRanks = [];
    this.filterOption = 1;
  }

  ngOnInit() {
  }

  filterLeaderboardRuns(mapID?: number) {
    if (this.filterOption === 1) {
        return this.rankService.getRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10,
            },
        });
    } else if (this.filterOption === 2) {
        return this.rankService.getAroundRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10,
            },
        });
    } else if (this.filterOption === 3) {
        return this.rankService.getFriendsRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10,
            },
        });
    }
  }

  loadLeaderboardRuns(mapID?: number) {
    this.searchedRanks = false;
    this.filterLeaderboardRuns(mapID).pipe(finalize(() => this.searchedRanks = true))
      .subscribe(res => {
        if (res.count)
          this.leaderboardRanks = res.ranks;
    }, err => {
      this.toasterService.danger(err.message, 'Could not find runs');
    });
  }

  viewRun(run: Run) {
    this.router.navigate(['/dashboard/runs/' + run.id]);
  }
}
