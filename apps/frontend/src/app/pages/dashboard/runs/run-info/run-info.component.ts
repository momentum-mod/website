import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { RanksService, RunsService } from '@momentum/frontend/data';
import { Run } from '@momentum/types';
import { switchMap } from 'rxjs/operators';

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
            expand: ['user', 'map', 'runStats', 'runZoneStats', 'rank']
          })
        )
      )
      .subscribe((run) => {
        this.run = run;
        if (this.run.rank) this.personalBestRun = this.run;
        else {
          const options = {
            userID: this.run.userID,
            track: this.run.trackNum,
            zone: this.run.zoneNum,
            flags: this.run.flags,
            take: 1
          };
          this.rankService
            .getRanks(this.run.mapID, options)
            .subscribe((response) => {
              if (response.totalCount && response.totalCount === 1)
                this.personalBestRun = response.response[0].run;
            });
        }
      });
  }
}
