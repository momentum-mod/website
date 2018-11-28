import {Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'map-info-description',
  templateUrl: './map-info-description.component.html',
  styleUrls: ['./map-info-description.component.scss'],
})
export class MapInfoDescriptionComponent implements OnInit {

  @Input('map') map;

  constructor() { }

  ngOnInit() {
  }

}
