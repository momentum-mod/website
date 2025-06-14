import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject
} from '@angular/core';
import { ReportCategory, ReportType, Report } from '@momentum/constants';
import { DialogService } from 'primeng/dynamicdialog';
import { UpdateReportDialogComponent } from '../update-report-dialog/update-report-dialog.component';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../../../../components/avatar/avatar.component';

@Component({
  selector: 'm-queued-report',
  imports: [RouterLink, AvatarComponent],
  templateUrl: './queued-report.component.html'
})
export class QueuedReportComponent implements OnInit {
  private readonly dialogService = inject(DialogService);

  @Input() report: Report;
  @Output() reportUpdate = new EventEmitter<Report>();

  typeText: string;
  categoryText: string;
  reportedResourceURL = '';

  ngOnInit() {
    switch (this.report.type) {
      case ReportType.USER_PROFILE_REPORT:
        this.typeText = 'User Profile Report';
        this.reportedResourceURL = '/profile/' + this.report.data;
        break;
      case ReportType.MAP_REPORT:
        this.typeText = 'Map Report';
        this.reportedResourceURL = '/maps/' + this.report.data;
        break;
      case ReportType.MAP_COMMENT_REPORT:
        this.typeText = 'Map Comment Report';
        this.reportedResourceURL = '/';
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
        header: 'Update Report',
        data: { report: this.report }
      })
      .onClose.subscribe((report) => {
        if (report) this.reportUpdate.emit(report);
      });
  }
}
