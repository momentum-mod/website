import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {switchMap} from 'rxjs/operators';
import {MapsService} from '../../../../@core/data/maps.service';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';

@Component({
  selector: 'map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.scss'],
})

export class MapInfoComponent implements OnInit {
  map: MomentumMap;
  mapInLibrary: boolean;
  constructor(private route: ActivatedRoute,
              private mapService: MapsService,
              private locUserService: LocalUserService,
              private toastService: ToasterService) {
    this.mapInLibrary = false;
  }
  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
          this.mapService.getMap(params.get('id')),
      ),
    ).subscribe(map => {
      this.map = map;
      this.locUserService.isMapInLibrary(map.id).subscribe(() => {
        this.mapInLibrary = true;
      }, error => {
        this.mapInLibrary = error.status !== 404;
        // TODO: if there's ever server error (500) print some text?
      });
    });
  }

  onLibraryUpdate() {
    if (this.mapInLibrary) {
      this.locUserService.removeMapFromLibrary(this.map.id).subscribe(() => {
        this.mapInLibrary = false;
      });
    } else {
      this.locUserService.addMapToLibrary(this.map.id).subscribe(resp => {
        this.mapInLibrary = true;
      }, error => {
        this.toastService.popAsync('error', 'Cannot add map to library', error.message);
      });
    }
  }
}
