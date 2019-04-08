import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {RunsService} from '../../../../@core/data/runs.service';
import {switchMap} from 'rxjs/operators';
import {Run} from '../../../../@core/models/run.model';
import {UsersService} from '../../../../@core/data/users.service';

@Component({
  selector: 'run-info',
  templateUrl: './run-info.component.html',
  styleUrls: ['./run-info.component.scss'],
})
export class RunInfoComponent implements OnInit {

  run: Run;
  personalBestRun: Run;
  constructor(private route: ActivatedRoute,
              private runService: RunsService,
              private usersService: UsersService) {
    this.run = null;
    this.personalBestRun = null;
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        this.runService.getRun(params.get('id'), {
          params: { expand: 'user,map,runStats,runZoneStats,rank'},
        }),
      ),
    ).subscribe(run => {
      this.run = run;

      if (!this.run.isPersonalBest) {
        this.usersService.getRunHistory(this.run.playerID, {
          params: { isPersonalBest: true, mapID: this.run.mapID, limit: 1 },
        }).subscribe(resp => {
          if (resp.count && resp.count === 1)
            this.personalBestRun = resp.runs[0];
        });
      } else {
        this.personalBestRun = this.run;
      }
    });
  }

}
