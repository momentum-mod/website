import {Component, Input, OnInit} from '@angular/core';
import {RunsService} from '../../../../../@core/data/runs.service';
import {Run} from '../../../../../@core/models/run.model';
import {Router} from '@angular/router';
import {ToasterService} from 'angular2-toaster';
import {finalize} from 'rxjs/operators';

@Component({
  selector: 'map-leaderboard',
  templateUrl: './map-leaderboard.component.html',
  styleUrls: ['./map-leaderboard.component.scss'],
})
export class MapLeaderboardComponent implements OnInit {

  @Input('mapID') mapID: number;
  filterActive: boolean;
  leaderboardRuns: Run[];
  searchedRuns: boolean;

  constructor(private runService: RunsService,
              private router: Router,
              private toasterService: ToasterService) {
    this.filterActive = false;
    this.searchedRuns = false;
    this.leaderboardRuns = [];
  }

  ngOnInit() {
  }

  loadLeaderboardRuns(mapID?: number) {
    this.runService.getMapRuns(mapID || this.mapID, {
      params: {
        isPersonalBest: true,
        limit: 10,
      },
    }).pipe(finalize(() => this.searchedRuns = true))
      .subscribe(res => {
      this.leaderboardRuns = res.runs;
    }, err => {
      this.toasterService.popAsync('error', 'Could not find runs', err.message);
    });
  }

  viewRun(run: Run) {
    this.router.navigate(['/dashboard/runs/' + run.id]);
  }
}
