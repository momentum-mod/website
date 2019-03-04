import { Component, OnInit } from '@angular/core';
import {AdminService} from '../../../../@core/data/admin.service';
import {ToasterService} from 'angular2-toaster';
import {Report} from '../../../../@core/models/report.model';
import {ReportType} from '../../../../@core/models/report-type.model';
import {finalize} from 'rxjs/operators';

@Component({
  selector: 'report-queue',
  templateUrl: './report-queue.component.html',
  styleUrls: ['./report-queue.component.scss'],
})
export class ReportQueueComponent implements OnInit {

  ReportType: typeof ReportType;
  isLoading: boolean;
  reportQueue: Report[];
  reportQueueCount: number;
  pageLimit: number;
  currentPage: number;
  filters: any;

  constructor(private adminService: AdminService,
              private toasterService: ToasterService) {
    this.ReportType = ReportType;
    this.isLoading = false;
    this.reportQueueCount = 0;
    this.pageLimit = 5;
    this.currentPage = 1;
    this.filters = {
      resolved: false,
    };
  }

  ngOnInit() {
    this.loadReportQueue();
  }

  loadReportQueue() {
    this.reportQueue = [];
    this.reportQueueCount = 0;
    this.isLoading = true;
    this.adminService.getReports({
      params: {
        expand: 'submitter,resolver',
        offset: (this.currentPage - 1) * this.pageLimit,
        resolved: this.filters.resolved,
      },
    }).pipe(
      finalize(() => this.isLoading = false),
    ).subscribe(res => {
      this.reportQueueCount = res.count;
      this.reportQueue = res.reports;
    }, err => {
      console.error(err);
      this.toasterService.popAsync('error', 'Failed to load report queue', 'error');
    });
  }

  onPageChange(pageNum) {
    this.currentPage = pageNum;
    this.loadReportQueue();
  }

}
