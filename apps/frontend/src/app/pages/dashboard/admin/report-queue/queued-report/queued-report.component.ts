import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ReportCategory, ReportType } from '@momentum/constants';
import { Report } from '@momentum/types';
import { NbDialogService } from '@nebular/theme';
import { UpdateReportDialogComponent } from '../update-report-dialog/update-report-dialog.component';

@Component({
  selector: 'mom-queued-report',
  templateUrl: './queued-report.component.html',
  styleUrls: ['./queued-report.component.scss']
})
export class QueuedReportComponent implements OnInit {
  @Input() report: Report;
  @Output() reportUpdate: EventEmitter<Report>;
  typeText: string;
  categoryText: string;
  reportedResourceURL: string;

  constructor(private dialogService: NbDialogService) {
    this.reportedResourceURL = '';
    this.reportUpdate = new EventEmitter();
  }

  ngOnInit() {
    switch (this.report.type) {
      case ReportType.USER_PROFILE_REPORT:
        this.typeText = 'User Profile Report';
        this.reportedResourceURL = '/dashboard/profile/' + this.report.data;
        break;
      case ReportType.MAP_REPORT:
        this.typeText = 'Map Report';
        this.reportedResourceURL = '/dashboard/maps/' + this.report.data;
        break;
      case ReportType.MAP_COMMENT_REPORT:
        this.typeText = 'Map Comment Report';
        this.reportedResourceURL = '/dashboard/';
        break;
    }
    switch (this.report.category) {
      case ReportCategory.INAPPROPRIATE_CONTENT:
        this.categoryText = 'Inappropriate Content';
        break;
      case ReportCategory.SPAM:
        this.categoryText = 'Spam';
        break;
      case ReportCategory.PLAGIARISM:
        this.categoryText = 'Plagiarism';
        break;
      case ReportCategory.OTHER:
        this.categoryText = 'Other';
        break;
    }
  }

  update() {
    this.dialogService
      .open(UpdateReportDialogComponent, {
        context: {
          report: this.report
        }
      })
      .onClose.subscribe((report) => {
        if (report) this.reportUpdate.emit(report);
      });
  }
}
