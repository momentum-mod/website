import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MapLibraryEntry} from '../../../../@core/models/map-library-entry';
import {finalize} from 'rxjs/operators';
import {ToasterService} from 'angular2-toaster';

@Component({
  selector: 'map-library',
  templateUrl: './map-library.component.html',
  styleUrls: ['./map-library.component.scss'],
})
export class MapLibraryComponent implements OnInit {

  entries: MapLibraryEntry[];
  sentRequest: boolean;
  constructor(private locUsrService: LocalUserService, private toastService: ToasterService) {
    this.entries = [];
    this.sentRequest = false;
  }

  ngOnInit() {
    this.locUsrService.getMapLibrary()
      .pipe(finalize(() => this.sentRequest = true))
      .subscribe(resp => {
      this.entries = resp.entries;
    }, error => {
        this.toastService.popAsync('error', 'Cannot get map library', error.message);
      });
  }
}
