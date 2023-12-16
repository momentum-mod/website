import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MMap } from '@momentum/constants';
import { LocalUserService } from '@momentum/frontend/data';
import { MapStatusName } from '@momentum/constants';
import { SharedModule } from '../../../../shared.module';
import { MessageService } from 'primeng/api';
import { AvatarComponent } from '../../../../components/avatar/avatar.component';

@Component({
  selector: 'm-map-list-item',
  templateUrl: './map-list-item.component.html',
  standalone: true,
  imports: [SharedModule, AvatarComponent]
})
export class MapListItemComponent implements OnInit {
  @Input() map: MMap;
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
    private messageService: MessageService
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
    this.status = MapStatusName.get(this.map.status as any);
  }

  toggleMapInFavorites() {
    if (this.mapInFavorites) {
      this.localUserService.removeMapFromFavorites(this.map.id).subscribe({
        next: () => {
          this.mapInFavorites = false;
          this.favoriteUpdate.emit(false);
          this.messageService.add({
            severity: 'success',
            detail: 'Removed map from favorites'
          });
        },
        error: (error) =>
          this.messageService.add({
            summary: 'Failed to remove map from favorites',
            detail: error.message
          })
      });
    } else {
      this.localUserService.addMapToFavorites(this.map.id).subscribe({
        next: () => {
          this.mapInFavorites = true;
          this.favoriteUpdate.emit(true);
          this.messageService.add({
            severity: 'success',
            detail: 'Added map to favorites'
          });
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to add map to favorites',
            detail: error.message
          })
      });
    }
  }

  toggleMapInLibrary() {
    if (this.mapInLibrary) {
      this.localUserService.removeMapFromLibrary(this.map.id).subscribe({
        next: () => {
          this.mapInLibrary = false;
          this.libraryUpdate.emit(false);
          this.messageService.add({
            severity: 'success',
            detail: 'Removed map from library'
          });
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to remove map from library',
            detail: error.message
          })
      });
    } else {
      this.localUserService.addMapToLibrary(this.map.id).subscribe({
        next: () => {
          this.mapInLibrary = true;
          this.libraryUpdate.emit(true);
          this.messageService.add({
            severity: 'success',
            detail: 'Added map to library'
          });
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to add map to library',
            detail: error.message
          })
      });
    }
  }
}
