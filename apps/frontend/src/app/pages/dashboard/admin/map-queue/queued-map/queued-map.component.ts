import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef
} from '@angular/core';
import { MomentumMap } from '../../../../../@core/models/momentum-map.model';
import { MapUploadStatus } from '../../../../../@core/models/map-upload-status.model';
import { AdminService } from '../../../../../@core/data/admin.service';
import { MapsService } from '../../../../../@core/data/maps.service';
import { NbToastrService } from '@nebular/theme';

@Component({
  selector: 'mom-queued-map',
  templateUrl: './queued-map.component.html',
  styleUrls: ['./queued-map.component.scss']
})
export class QueuedMapComponent {
  MapUploadStatus: typeof MapUploadStatus = MapUploadStatus;
  @Input() map: MomentumMap;
  @Output() onStatusUpdate = new EventEmitter();
  @ViewChild('mapFileDownloadLink', { static: false })
  private mapFileDownloadLink: ElementRef;

  constructor(
    private adminService: AdminService,
    private mapService: MapsService,
    private toasterService: NbToastrService
  ) {}
  updateMapStatus(mapID: number, statusFlag: number) {
    this.adminService
      .updateMap(mapID, {
        statusFlag: statusFlag
      })
      .subscribe({
        next: () => this.onStatusUpdate.emit(),
        error: (error) =>
          this.toasterService.danger(
            error.message,
            'Failed to update map status'
          )
      });
  }

  onMapFileDownload(mapID: number) {
    this.mapService.downloadMapFile(mapID).subscribe({
      next: (data) => {
        const url = window.URL.createObjectURL(data);
        const link = this.mapFileDownloadLink.nativeElement;
        link.href = url;
        link.download = this.map.name + '.bsp';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error(error);
        this.toasterService.danger(
          error.message,
          'Failed to start map file download'
        );
      }
    });
  }
}
