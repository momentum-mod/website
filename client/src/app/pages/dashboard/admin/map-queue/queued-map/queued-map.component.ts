import { Component, Input, OnInit } from '@angular/core';
import { MomentumMap } from '../../../../../@core/models/momentum-map.model';
import { MapUploadStatus } from '../../../../../@core/models/map-upload-status.model';
import { AdminService } from '../../../../../@core/data/admin.service';
import { ToasterService } from 'angular2-toaster';

@Component({
  selector: 'queued-map',
  templateUrl: './queued-map.component.html',
  styleUrls: ['./queued-map.component.css'],
})
export class QueuedMapComponent implements OnInit {

  statusEnum = MapUploadStatus;
  @Input('map') map: MomentumMap = null;

  constructor(private adminService: AdminService,
    private toasterService: ToasterService) { }

  ngOnInit() {
  }

  updateMapStatus(mapID: string, statusFlag: number) {
    // TODO: improve to use status flag enum and stuff
    this.adminService.updateMap(mapID, {
      statusFlag: statusFlag,
    }).subscribe(() => {
      // reload queue
    }, err => {
      console.error(err);
      this.toasterService.popAsync('error', 'Failed to update map status', '');
    });
  }

}
