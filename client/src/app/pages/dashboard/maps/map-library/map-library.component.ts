import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MapLibraryEntry} from '../../../../@core/models/map-library-entry';

@Component({
  selector: 'map-library',
  templateUrl: './map-library.component.html',
  styleUrls: ['./map-library.component.scss'],
})
export class MapLibraryComponent implements OnInit {

  entries: MapLibraryEntry[];
  constructor(private locUsrService: LocalUserService) {
  }

  ngOnInit() {
    this.locUsrService.getMapLibrary().subscribe(resp => {
      this.entries = resp.entries;
    });
  }
}
