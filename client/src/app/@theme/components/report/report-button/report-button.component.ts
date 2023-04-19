import { Component, Input, OnInit } from '@angular/core';
import { NbDialogService } from '@nebular/theme';
import { CreateReportDialogComponent } from '../create-report-dialog/create-report-dialog.component';
import { ReportType } from '../../../../@core/models/report-type.model';

@Component({
  selector: 'report-button',
  templateUrl: './report-button.component.html',
  styleUrls: ['./report-button.component.scss']
})
export class ReportButtonComponent implements OnInit {
  @Input() reportType: ReportType;
  @Input() reportData: string;

  constructor(private dialogService: NbDialogService) {}

  ngOnInit() {}

  onClick(event: Event) {
    this.dialogService.open(CreateReportDialogComponent, {
      context: {
        reportData: this.reportData,
        reportType: this.reportType
      }
    });
  }
}
