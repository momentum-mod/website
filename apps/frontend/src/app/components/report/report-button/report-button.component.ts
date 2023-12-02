import { Component, Input } from '@angular/core';
import { ReportType } from '@momentum/constants';
import { NbDialogService, NbButtonModule } from '@nebular/theme';
import { CreateReportDialogComponent } from '../create-report-dialog/create-report-dialog.component';
import { IconComponent } from '@momentum/frontend/icons';

@Component({
  selector: 'm-report-button',
  templateUrl: './report-button.component.html',
  standalone: true,
  imports: [NbButtonModule, IconComponent]
})
export class ReportButtonComponent {
  @Input() reportType: ReportType;
  @Input() reportData: string;

  constructor(private dialogService: NbDialogService) {}

  onClick() {
    this.dialogService.open(CreateReportDialogComponent, {
      context: {
        reportData: this.reportData,
        reportType: this.reportType
      }
    });
  }
}
