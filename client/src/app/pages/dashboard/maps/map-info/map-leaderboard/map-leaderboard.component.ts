import {Component, Input, OnInit} from '@angular/core';
import {Run} from '../../../../../@core/models/run.model';
import {Router} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {RanksService} from '../../../../../@core/data/ranks.service';
import {UserMapRank} from '../../../../../@core/models/user-map-rank.model';
import {NbDialogService, NbToastrService} from '@nebular/theme';
import {AdminService} from '../../../../../@core/data/admin.service';
import {ConfirmDialogComponent} from '../../../../../@theme/components/confirm-dialog/confirm-dialog.component';

export enum LeaderboardType {
  TOP10 = 1,
  AROUND = 2,
  FRIENDS = 3,
}

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
    this.loadLeaderboardRuns();
  }
  @Input('isAdmin') isAdmin: boolean;
  filterActive: boolean;
  leaderboardRanks: UserMapRank[];
  searchedRanks: boolean;
  LeaderboardTypeEnum: any;
  filterLeaderboardType: LeaderboardType;

  constructor(private rankService: RanksService,
              private adminService: AdminService,
              private router: Router,
              private dialogService: NbDialogService,
              private toasterService: NbToastrService) {
    this.filterActive = false;
    this.searchedRanks = false;
    this.leaderboardRanks = [];
    this.LeaderboardTypeEnum = LeaderboardType;
    this.filterLeaderboardType = LeaderboardType.TOP10;
  }

  ngOnInit() {
  }

  filterLeaderboardRuns(mapID?: number) {
    if (this.filterLeaderboardType === this.LeaderboardTypeEnum.TOP10) {
        return this.rankService.getRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10,
            },
        });
    } else if (this.filterLeaderboardType === this.LeaderboardTypeEnum.AROUND) {
        return this.rankService.getAroundRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10,
            },
        });
    } else if (this.filterLeaderboardType === this.LeaderboardTypeEnum.FRIENDS) {
        return this.rankService.getFriendsRanks(mapID || this.mapID, {
          params: {
            // TODO do further filtering here
            limit: 10,
            },
        });
    }
  }

  loadLeaderboardRuns() {
    this.searchedRanks = false;
    this.filterLeaderboardRuns(this._mapID).pipe(finalize(() => this.searchedRanks = true))
      .subscribe(res => {
        if (res.count >= 0)
          this.leaderboardRanks = res.ranks;
    }, err => {
      this.toasterService.danger(err.message, 'Could not find runs');
    });
  }

  viewRun(run: Run) {
    this.router.navigate(['/dashboard/runs/' + run.id]);
  }

  deleteRun(run: Run) {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Are you sure?',
        message: 'You are about to permanently delete this run. Are you sure you want to proceed?',
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.adminService.deleteRun(run.id).subscribe(res => {
          this.loadLeaderboardRuns();
          this.toasterService.success('Successfully deleted the run', 'Success');
        }, err => {
          this.toasterService.danger('Failed to delete the run', 'Failed');
        });
      }
    });
  }
}
