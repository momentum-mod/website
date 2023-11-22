import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { NbToastrService, NbCardModule, NbListModule } from '@nebular/theme';
import { ReportType } from '@momentum/constants';
import { Report } from '@momentum/constants';
import { AdminService } from '@momentum/frontend/data';
import { NgxPaginationModule } from 'ngx-pagination';
import { QueuedReportComponent } from './queued-report/queued-report.component';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'mom-report-queue',
  templateUrl: './report-queue.component.html',
  styleUrls: ['./report-queue.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    FormsModule,
    NgIf,
    NbListModule,
    NgFor,
    QueuedReportComponent,
    NgxPaginationModule
  ]
})
export class ReportQueueComponent implements OnInit {
  ReportType: typeof ReportType;
  isLoading: boolean;
  reportQueue: Report[];
  reportQueueCount: number;
  pageLimit: number;
  currentPage: number;
  filters: any;

  constructor(
    private adminService: AdminService,
    private toasterService: NbToastrService
  ) {
    this.ReportType = ReportType;
    this.isLoading = false;
    this.reportQueueCount = 0;
    this.pageLimit = 5;
    this.currentPage = 1;
    this.filters = {
      resolved: false
    };
  }

  ngOnInit() {
    this.loadReportQueue();
  }

  loadReportQueue() {
    this.reportQueue = [];
    this.reportQueueCount = 0;
    this.isLoading = true;
    this.adminService
      .getReports({
        expand: ['submitter', 'resolver'],
        skip: (this.currentPage - 1) * this.pageLimit,
        resolved: this.filters.resolved
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.reportQueueCount = response.totalCount;
          this.reportQueue = response.data;
        },
        error: (error) => {
          console.error(error);
          this.toasterService.danger('Failed to load report queue');
        }
      });
  }

  onPageChange(pageNum) {
    this.currentPage = pageNum;
    this.loadReportQueue();
  }
}
