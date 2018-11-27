import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'map-info-description',
  templateUrl: './map-info-description.component.html',
  styleUrls: ['./map-info-description.component.scss'],
})
export class MapInfoDescriptionComponent implements OnInit {

  @Input('map') map;
  @Input('mapInLibrary') mapInLibrary;
  @Output () libraryUpdate = new EventEmitter();
  constructor() { }

  ngOnInit() {
  }

  onLibraryUpdate () {
    this.libraryUpdate.emit();
  }

}
