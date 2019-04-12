import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-map-queue',
  template: `
    <nb-card>
      <nb-card-header><h2>BROWSE MAPS</h2></nb-card-header>
      <nb-card-body>
        <map-list [type]="'browse'"></map-list>
      </nb-card-body>
    </nb-card>`,
})
export class ViewMapsComponent implements OnInit {
  constructor() {}

  ngOnInit() {
  }
}
