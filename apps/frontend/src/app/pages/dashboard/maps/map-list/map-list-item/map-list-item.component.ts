import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NbToastrService } from '@nebular/theme';
import { Map } from '@momentum/types';
import { LocalUserService } from '@momentum/frontend/data';
import { MapStatusName } from '@momentum/constants';

@Component({
  selector: 'mom-map-list-item',
  templateUrl: './map-list-item.component.html',
  styleUrls: ['./map-list-item.component.scss']
})
export class MapListItemComponent implements OnInit {
  @Input() map: Map;
  @Input() isUpload: boolean;
  @Input() inLibrary: boolean;
  @Input() inFavorites: boolean;
  @Input() showDownloadButton: boolean;
  @Output() libraryUpdate = new EventEmitter();
  @Output() favoriteUpdate = new EventEmitter();
  mapInFavorites: boolean;
  mapInLibrary: boolean;
  status: string;

  constructor(
    private localUserService: LocalUserService,
    private toastService: NbToastrService
  ) {
    this.inLibrary = false;
    this.inFavorites = false;
    this.isUpload = false;
    this.map = null;
    this.status = '';
  }

  ngOnInit() {
    this.mapInFavorites = this.inFavorites;
    this.mapInLibrary = this.inLibrary;
    this.status = MapStatusName.get(this.map.status);
  }

  toggleMapInFavorites() {
    if (this.mapInFavorites) {
      this.localUserService.removeMapFromFavorites(this.map.id).subscribe({
        next: () => {
          this.mapInFavorites = false;
          this.favoriteUpdate.emit(false);
          this.toastService.success('Removed map from favorites', 'Success');
        },
        error: () =>
          this.toastService.danger(
            'Failed to remove map from favorites',
            'Error'
          )
      });
    } else {
      this.localUserService.addMapToFavorites(this.map.id).subscribe({
        next: () => {
          this.mapInFavorites = true;
          this.favoriteUpdate.emit(true);
          this.toastService.success('Added map to favorites', 'Success');
        },
        error: () =>
          this.toastService.danger('Failed to add map to favorites', 'Error')
      });
    }
  }

  toggleMapInLibrary() {
    if (this.mapInLibrary) {
      this.localUserService.removeMapFromLibrary(this.map.id).subscribe({
        next: () => {
          this.mapInLibrary = false;
          this.libraryUpdate.emit(false);
          this.toastService.success('Removed map from library', 'Success');
        },
        error: (error) =>
          this.toastService.danger(
            error.message,
            'Failed to remove map from library'
          )
      });
    } else {
      this.localUserService.addMapToLibrary(this.map.id).subscribe({
        next: () => {
          this.mapInLibrary = true;
          this.libraryUpdate.emit(true);
          this.toastService.success('Added map to library', 'Success');
        },
        error: (error) =>
          this.toastService.danger(
            error.message,
            'Failed to add map to library'
          )
      });
    }
  }
}
