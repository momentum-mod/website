import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {switchMap} from 'rxjs/operators';
import {of} from 'rxjs';

@Component({
  selector: 'outgoing-catch',
  templateUrl: './outgoing.component.html',
  styleUrls: ['./outgoing.component.scss'],
})
export class OutgoingComponent implements OnInit {
  outgoingURL: string;
  constructor(private route: ActivatedRoute) {
  }
  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => of(params.get('url'))),
    ).subscribe(url => {
      this.outgoingURL = decodeURIComponent(url);
    });
  }
}
