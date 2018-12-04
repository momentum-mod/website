import {Component, Input, OnInit} from '@angular/core';
import {RunsService} from '../../../../../@core/data/runs.service';
import {Run} from '../../../../../@core/models/run.model';
import {Router} from '@angular/router';

@Component({
  selector: 'map-leaderboard',
  templateUrl: './map-leaderboard.component.html',
  styleUrls: ['./map-leaderboard.component.scss'],
})
export class MapLeaderboardComponent implements OnInit {

  @Input('mapID') mapID: number;
  filterActive: boolean;
  leaderboardRuns: Run[];

  constructor(private runService: RunsService,
              private router: Router) {
    this.filterActive = false;
  }

  ngOnInit() {
  }

  loadLeaderboardRuns(mapID?: number) {
    this.runService.getMapRuns(mapID || this.mapID, {
      params: {
        isPersonalBest: true,
        limit: 10,
      },
    }).subscribe(res => {
      this.leaderboardRuns = res.runs;
    }, err => {
      console.error(err);
    });
  }

  viewRun(run: Run) {
    this.router.navigate(['/dashboard/runs/' + run.id]);
  }
}
