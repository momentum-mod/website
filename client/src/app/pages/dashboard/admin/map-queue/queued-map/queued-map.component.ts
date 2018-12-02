import {Component, Input, Output, OnInit, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import { MomentumMap } from '../../../../../@core/models/momentum-map.model';
import { MapUploadStatus } from '../../../../../@core/models/map-upload-status.model';
import { AdminService } from '../../../../../@core/data/admin.service';
import { ToasterService } from 'angular2-toaster';
import { MapsService } from '../../../../../@core/data/maps.service';

@Component({
  selector: 'queued-map',
  templateUrl: './queued-map.component.html',
  styleUrls: ['./queued-map.component.scss'],
})
export class QueuedMapComponent implements OnInit {

  MapUploadStatus: typeof MapUploadStatus = MapUploadStatus;
  @Input('map') map: MomentumMap;
  @Output() onStatusUpdate = new EventEmitter();
  @ViewChild('mapFileDownloadLink') private mapFileDownloadLink: ElementRef;

  constructor(private adminService: AdminService,
    private mapService: MapsService,
    private toasterService: ToasterService) { }

  ngOnInit() {
  }

  updateMapStatus(mapID: string, statusFlag: number) {
    this.adminService.updateMap(mapID, {
      statusFlag: statusFlag,
    }).subscribe(() => {
      this.onStatusUpdate.emit();
    }, err => {
      console.error(err);
      this.toasterService.popAsync('error', 'Failed to update map status', '');
    });
  }

  onMapFileDownload(mapID: string) {
    this.mapService.downloadMapFile(mapID).subscribe(data => {
      const blob = new Blob([data], { type: 'application/octect-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = this.mapFileDownloadLink.nativeElement;
      link.href = url;
      link.download = this.map.name + '.bsp';
      link.click();
      window.URL.revokeObjectURL(url);
    }, err => {
      console.error(err);
      this.toasterService.popAsync('error', 'Failed to start map file download', '');
    });
  }

}
