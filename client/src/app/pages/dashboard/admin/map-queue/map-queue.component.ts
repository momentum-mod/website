import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../../@core/data/admin.service';
import { MomentumMap } from '../../../../@core/models/momentum-map.model';
import { MapUploadStatus } from '../../../../@core/models/map-upload-status.model';
import {ToasterService} from 'angular2-toaster';

@Component({
  selector: 'app-map-queue',
  templateUrl: './map-queue.component.html',
  styleUrls: ['./map-queue.component.scss'],
})
export class MapQueueComponent implements OnInit {

  priorityQueue: MomentumMap[];
  nonPriorityQueue: MomentumMap[];
  priorityQueuePage: number;
  nonPriorityQueuePage: number;

  constructor(private adminService: AdminService,
              private toasterService: ToasterService) {
    this.priorityQueuePage = 0;
    this.nonPriorityQueuePage = 0;
  }

  ngOnInit() {
    this.loadMapQueue(true);
    this.loadMapQueue(false);
  }

  loadMapQueue(priority: boolean) {
    this.adminService.getMaps({
      params: {
        expand: 'info,submitter',
        page: priority ? this.priorityQueuePage : this.nonPriorityQueuePage,
        limit: 5,
        priority: priority,
        status: MapUploadStatus.PENDING,
      },
    }).subscribe(res => {
      if (priority) this.priorityQueue = res.maps;
      else this.nonPriorityQueue = res.maps;
      // console.log(res.maps);
    }, err => {
      console.error(err);
      this.toasterService.popAsync('error', 'Failed to load priority queue', 'error');
    });
  }

}
