import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'map-favorites',
  template: `<nb-card>
    <nb-card-header><h2>FAVORITE MAPS</h2></nb-card-header>
    <nb-card-body>
      <map-list [type]="'favorites'"></map-list>
    </nb-card-body>
  </nb-card>`,
})
export class MapFavoritesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
