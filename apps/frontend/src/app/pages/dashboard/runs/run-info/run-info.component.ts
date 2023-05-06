import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { RunsService } from '../../../../@core/data/runs.service';
import { switchMap } from 'rxjs/operators';
import { Run } from '../../../../@core/models/run.model';
import { RanksService } from '../../../../@core/data/ranks.service';

@Component({
  selector: 'mom-run-info',
  templateUrl: './run-info.component.html',
  styleUrls: ['./run-info.component.scss']
})
export class RunInfoComponent implements OnInit {
  run: Run;
  personalBestRun: Run;
  constructor(
    private route: ActivatedRoute,
    private runService: RunsService,
    private rankService: RanksService
  ) {
    this.run = null;
    this.personalBestRun = null;
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) =>
          this.runService.getRun(params.get('id'), {
            params: { expand: 'user,map,runStats,runZoneStats,rank' }
          })
        )
      )
      .subscribe((run) => {
        this.run = run;
        if (this.run.rank) this.personalBestRun = this.run;
        else {
          const options = {
            params: {
              userID: this.run.playerID,
              track: this.run.trackNum,
              zone: this.run.zoneNum,
              flags: this.run.flags,
              limit: 1
            }
          };
          this.rankService
            .getRanks(this.run.mapID, options)
            .subscribe((resp) => {
              if (resp.count && resp.count === 1)
                this.personalBestRun = resp.ranks[0].run;
            });
        }
      });
  }
}
