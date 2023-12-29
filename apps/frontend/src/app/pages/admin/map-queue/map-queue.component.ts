import { Component, OnInit } from '@angular/core';
import { MMap } from '@momentum/constants';
import { AdminService } from '@momentum/frontend/data';
import { MapStatus } from '@momentum/constants';
import { SharedModule } from '../../../shared.module';
import { QueuedMapComponent } from './queued-map/queued-map.component';
import { MessageService } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';

@Component({
  templateUrl: './map-queue.component.html',
  standalone: true,
  imports: [SharedModule, QueuedMapComponent, TabViewModule]
})
export class MapQueueComponent implements OnInit {
  priorityQueue: MMap[];
  nonPriorityQueue: MMap[];
  priorityQueueCount = 0;
  nonPriorityQueueCount = 0;
  // TODO: Not yet ported to PrimeNG pagination!
  pageLimit = 5;
  priorityQueuePage = 1;
  nonPriorityQueuePage = 1;

  constructor(
    private readonly adminService: AdminService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadMapQueue(true);
    this.loadMapQueue(false);
  }

  loadMapQueue(priority: boolean) {
    this.adminService
      .getMaps({
        expand: ['info', 'submitter', 'thumbnail'],
        skip:
          ((priority ? this.priorityQueuePage : this.nonPriorityQueuePage) -
            1) *
          this.pageLimit,
        take: this.pageLimit,
        priority: priority,
        filter: MapStatus.PENDING as any // Just getting this compiling til we work on frontend map submissions
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
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to load priority queue'
          });
        }
      });
  }

  onPageChange(pageNum, isPriority: boolean) {
    if (isPriority) this.priorityQueuePage = pageNum;
    else this.nonPriorityQueuePage = pageNum;
    this.loadMapQueue(isPriority);
  }
}
