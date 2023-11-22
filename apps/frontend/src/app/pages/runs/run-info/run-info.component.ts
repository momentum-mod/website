import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { LeaderboardsService, PastRunsService } from '@momentum/frontend/data';
import { LeaderboardRun, PastRun } from '@momentum/constants';
import { switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { TimingPipe } from '../../../../../../../libs/frontend/pipes/src/lib/timing.pipe';
import { NbCardModule, NbUserModule } from '@nebular/theme';
import { NgIf } from '@angular/common';

@Component({
  selector: 'mom-run-info',
  templateUrl: './run-info.component.html',
  styleUrls: ['./run-info.component.scss'],
  standalone: true,
  imports: [NgIf, NbCardModule, RouterLink, NbUserModule, TimingPipe]
})
export class RunInfoComponent implements OnInit {
  run: PastRun;
  pbRun: LeaderboardRun;

  constructor(
    private route: ActivatedRoute,
    private runService: PastRunsService,
    private leaderboardsService: LeaderboardsService
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) =>
          this.runService.getRun(params.get('id'), {
            expand: ['map', 'user', 'leaderboardRun']
          })
        )
      )
      .subscribe(async (run) => {
        this.run = run;
        this.pbRun = this.run.isPB
          ? run.leaderboardRun
          : await firstValueFrom(
              this.leaderboardsService.getRun(this.run.mapID, {
                userID: this.run.userID,
                gamemode: this.run.gamemode,
                trackType: this.run.trackType,
                trackNum: this.run.trackNum,
                style: this.run.style
              })
            );
      });
  }
}
