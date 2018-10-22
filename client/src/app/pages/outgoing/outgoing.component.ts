import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {switchMap} from 'rxjs/operators';
import {Observable, of} from 'rxjs';

@Component({
  selector: 'outgoing-catch',
  templateUrl: './outgoing.component.html',
  styleUrls: ['./outgoing.component.scss'],
})
export class OutgoingComponent implements OnInit {
  outgoingUrl$: Observable<string>;
  constructor(private route: ActivatedRoute) {
  }
  ngOnInit(): void {
    this.outgoingUrl$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) => of(params.get('url'))),
    );
  }
}
