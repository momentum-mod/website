import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../../@core/data/admin.service';
import { MomentumMap } from '../../../../@core/models/momentum-map.model';
import { MapUploadStatus } from '../../../../@core/models/map-upload-status.model';

@Component({
  selector: 'app-map-queue',
  templateUrl: './map-queue.component.html',
})
export class MapQueueComponent implements OnInit {

  priorityQueue: MomentumMap[];
  nonPriorityQueue: MomentumMap[];
  priorityQueuePage: number;
  nonPriorityQueuePage: number;

  constructor(private adminService: AdminService) {
    this.priorityQueuePage = 0;
    this.nonPriorityQueuePage = 0;
  }

  ngOnInit() {
    this.loadMapQueue(true);
    this.loadMapQueue(false);
  }

  loadMapQueue(priority: boolean, page?: number) {
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
      alert('Failed to load priority queue!');
    });
  }

}
