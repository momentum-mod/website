import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../../@core/data/admin.service';
import { MomentumMap } from '../../../../@core/models/momentum-map.model';
import { MapUploadStatus } from '../../../../@core/models/map-upload-status.model';
import { NbToastrService } from '@nebular/theme';

@Component({
  templateUrl: './map-queue.component.html',
  styleUrls: ['./map-queue.component.scss']
})
export class MapQueueComponent implements OnInit {
  priorityQueue: MomentumMap[];
  nonPriorityQueue: MomentumMap[];
  priorityQueueCount: number;
  nonPriorityQueueCount: number;
  pageLimit: number;
  priorityQueuePage: number;
  nonPriorityQueuePage: number;

  constructor(
    private adminService: AdminService,
    private toasterService: NbToastrService
  ) {
    this.priorityQueueCount = 0;
    this.nonPriorityQueueCount = 0;
    this.pageLimit = 5;
    this.priorityQueuePage = 1;
    this.nonPriorityQueuePage = 1;
  }

  ngOnInit() {
    this.loadMapQueue(true);
    this.loadMapQueue(false);
  }

  loadMapQueue(priority: boolean) {
    this.adminService
      .getMaps({
        params: {
          expand: 'info,submitter,thumbnail',
          offset:
            ((priority ? this.priorityQueuePage : this.nonPriorityQueuePage) -
              1) *
            this.pageLimit,
          limit: this.pageLimit,
          priority: priority,
          status: MapUploadStatus.PENDING
        }
      })
      .subscribe({
        next: (response) => {
          if (priority) {
            this.priorityQueueCount = response.count;
            this.priorityQueue = response.maps;
          } else {
            this.nonPriorityQueueCount = response.count;
            this.nonPriorityQueue = response.maps;
          }
        },
        error: (error) => {
          console.error(error);
          this.toasterService.danger('Failed to load priority queue');
        }
      });
  }

  onPageChange(pageNum, isPriority: boolean) {
    if (isPriority) this.priorityQueuePage = pageNum;
    else this.nonPriorityQueuePage = pageNum;
    this.loadMapQueue(isPriority);
  }
}
