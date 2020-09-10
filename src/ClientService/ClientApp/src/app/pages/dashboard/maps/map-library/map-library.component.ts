import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'map-library',
  template: `<nb-card>
    <nb-card-header><h2>MY LIBRARY</h2></nb-card-header>
    <nb-card-body>
      <map-list [type]="'library'"></map-list>
    </nb-card-body>
  </nb-card>`,
})
export class MapLibraryComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }
}
