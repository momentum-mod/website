import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef
} from '@angular/core';
import { MapStatus } from '@momentum/constants';
import { AdminService, MapsService } from '@momentum/frontend/data';
import { MMap } from '@momentum/constants';
import {
  NbToastrService,
  NbUserModule,
  NbButtonModule,
  NbIconModule
} from '@nebular/theme';
import { NbIconIconDirective } from '../../../../../../../../libs/frontend/directives/src/lib/icons/nb-icon-icon.directive';
import { NgOptimizedImage, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mom-queued-map',
  templateUrl: './queued-map.component.html',
  styleUrls: ['./queued-map.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    NgOptimizedImage,
    NbUserModule,
    NbButtonModule,
    NbIconModule,
    NbIconIconDirective,
    DatePipe
  ]
})
export class QueuedMapComponent {
  MapUploadStatus: typeof MapStatus = MapStatus;
  @Input() map: MMap;
  @Output() statusUpdate = new EventEmitter();
  @ViewChild('mapFileDownloadLink', { static: false })
  private mapFileDownloadLink: ElementRef;

  constructor(
    private adminService: AdminService,
    private mapService: MapsService,
    private toasterService: NbToastrService
  ) {}
  updateMapStatus(mapID: number, status: number) {
    this.adminService.updateMap(mapID, { status }).subscribe({
      next: () => this.statusUpdate.emit(),
      error: (error) =>
        this.toasterService.danger(error.message, 'Failed to update map status')
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
