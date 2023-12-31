import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef
} from '@angular/core';
import { MapStatus, MMap } from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { AdminService, MapsService } from '../../../../services';
import { SharedModule } from '../../../../shared.module';
import { AvatarComponent } from '../../../../components';

@Component({
  selector: 'm-queued-map',
  templateUrl: './queued-map.component.html',
  standalone: true,
  imports: [SharedModule, AvatarComponent]
})
export class QueuedMapComponent {
  protected readonly MapUploadStatus = MapStatus;

  @Input() map: MMap;
  @Output() statusUpdate = new EventEmitter();
  @ViewChild('mapFileDownloadLink', { static: false })
  private mapFileDownloadLink: ElementRef;

  constructor(
    private readonly adminService: AdminService,
    private readonly mapService: MapsService,
    private readonly messageService: MessageService
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
