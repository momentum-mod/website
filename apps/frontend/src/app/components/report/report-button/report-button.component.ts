import { Component, Input } from '@angular/core';
import { ReportType } from '@momentum/constants';
import { CreateReportDialogComponent } from '../create-report-dialog/create-report-dialog.component';
import { IconComponent } from '@momentum/frontend/icons';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
  selector: 'm-report-button',
  standalone: true,
  imports: [IconComponent],
  template: `
    <button class="m-btn m-btn-red" (click)="onClick()">
      <m-icon icon="flag-outline"></m-icon>
    </button>
  `
})
export class ReportButtonComponent {
  @Input() reportType: ReportType;
  @Input() reportData: string;

  constructor(private readonly dialogService: DialogService) {}

  onClick() {
    this.dialogService.open(CreateReportDialogComponent, {
      header: 'Submit Report',
      data: { reportData: this.reportData, reportType: this.reportType }
    });
  }
}
