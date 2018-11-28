import {Component, Input, OnInit} from '@angular/core';
import {RunsService} from '../../../../../@core/data/runs.service';
import {Run} from '../../../../../@core/models/run.model';

@Component({
  selector: 'map-leaderboard',
  templateUrl: './map-leaderboard.component.html',
  styleUrls: ['./map-leaderboard.component.scss'],
})
export class MapLeaderboardComponent implements OnInit {

  @Input('mapID') mapID: number;
  filterActive: boolean;
  leaderboardRuns: Run[];

  constructor(private runService: RunsService) {
    this.filterActive = false;
  }

  ngOnInit() {
  }

  loadLeaderboardRuns(mapID?: number) {
    this.runService.getRuns({
      params: {
        mapID: mapID || this.mapID,
        limit: 10,
      },
    }).subscribe(res => {
      this.leaderboardRuns = res.runs;
    }, err => {
      console.error(err);
    });
  }

}
