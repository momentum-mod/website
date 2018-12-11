import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {MomentumMap} from '../../../../../@core/models/momentum-map.model';
import {LocalUserService} from '../../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';

@Component({
  selector: 'map-list-item',
  templateUrl: './map-list-item.component.html',
  styleUrls: ['./map-list-item.component.scss'],
})
export class MapListItemComponent implements OnInit {

  @Input('map') map: MomentumMap;
  @Input('inLibrary') inLibrary: boolean;
  @Input('showDownloadButton') showDownloadButton: boolean;
  @Output() onLibraryUpdate = new EventEmitter();
  mapInFavorites: boolean;
  mapInLibrary: boolean;

  constructor(private localUserService: LocalUserService,
              private toastService: ToasterService) {

  }

  ngOnInit() {
    if (this.map.favorites && this.map.favorites.length)
      this.mapInFavorites = true;
    this.mapInLibrary = this.inLibrary;
  }

  toggleMapInFavorites() {
    if (this.mapInFavorites) {
      this.localUserService.removeMapFromFavorites(this.map.id).subscribe(() => {
        this.mapInFavorites = false;
        this.toastService.popAsync('success', 'Removed map from favorites');
      }, err => {
        this.toastService.popAsync('error', 'Failed to remove map from favorites');
      });
    } else {
      this.localUserService.addMapToFavorites(this.map.id).subscribe(() => {
        this.mapInFavorites = true;
        this.toastService.popAsync('success', 'Added map to favorites');
      }, err => {
        this.toastService.popAsync('error', 'Failed to add map to favorites');
      });
    }
  }

  toggleMapInLibrary() {
    if (this.mapInLibrary) {
      this.localUserService.removeMapFromLibrary(this.map.id).subscribe(() => {
        this.mapInLibrary = false;
        this.onLibraryUpdate.emit(false);
        this.toastService.popAsync('success', 'Removed map from library');
      }, err => {
        this.toastService.popAsync('error', 'Failed to remove map from library', err.message);
      });
    } else {
      this.localUserService.addMapToLibrary(this.map.id).subscribe(resp => {
        this.mapInLibrary = true;
        this.onLibraryUpdate.emit(true);
        this.toastService.popAsync('success', 'Added map to library');
      }, err => {
        this.toastService.popAsync('error', 'Failed to add map to library', err.message);
      });
    }
  }

}
