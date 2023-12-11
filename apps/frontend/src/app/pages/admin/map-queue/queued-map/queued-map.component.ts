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
import { SharedModule } from '../../../../shared.module';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-queued-map',
  templateUrl: './queued-map.component.html',
  standalone: true,
  imports: [SharedModule]
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
    private messageService: MessageService
  ) {}
  updateMapStatus(mapID: number, status: number) {
    this.adminService.updateMap(mapID, { status }).subscribe({
      next: () => this.statusUpdate.emit(),
      error: (error) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to update map status',
          detail: error.message
        })
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
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to start map file download',
          detail: error.message
        });
      }
    });
  }
}
