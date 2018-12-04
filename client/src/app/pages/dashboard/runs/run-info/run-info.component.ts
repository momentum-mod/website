import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {RunsService} from '../../../../@core/data/runs.service';
import {switchMap} from 'rxjs/operators';
import {Run} from '../../../../@core/models/run.model';

@Component({
  selector: 'run-info',
  templateUrl: './run-info.component.html',
  styleUrls: ['./run-info.component.scss'],
})
export class RunInfoComponent implements OnInit {

  run: Run;
  constructor(private route: ActivatedRoute,
              private runService: RunsService) {
    this.run = null;
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        this.runService.getRun(params.get('id'), {
          params: { expand: 'user,map,runStats'},
        }),
      ),
    ).subscribe(run => {
      this.run = run;
    });
  }

}
