import { Component, OnInit } from '@angular/core';
import { NbToastrService } from '@nebular/theme';
import { Map } from '@momentum/constants';
import { AdminService } from '@momentum/frontend/data';
import { MapStatus } from '@momentum/constants';

@Component({
  templateUrl: './map-queue.component.html',
  styleUrls: ['./map-queue.component.scss']
})
export class MapQueueComponent implements OnInit {
  priorityQueue: Map[];
  nonPriorityQueue: Map[];
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
        expand: ['info,submitter,thumbnail'],
        skip:
          ((priority ? this.priorityQueuePage : this.nonPriorityQueuePage) -
            1) *
          this.pageLimit,
        take: this.pageLimit,
        priority: priority,
        status: MapStatus.PENDING
      })
      .subscribe({
        next: (response) => {
          if (priority) {
            this.priorityQueueCount = response.totalCount;
            this.priorityQueue = response.data;
          } else {
            this.nonPriorityQueueCount = response.totalCount;
            this.nonPriorityQueue = response.data;
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
