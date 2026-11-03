import { Component, inject, input } from '@angular/core';
import { ReportType } from '@momentum/constants';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { CreateReportDialogComponent } from '../create-report-dialog/create-report-dialog.component';
import { IconComponent } from '../../../icons';

@Component({
  selector: 'm-report-button',
  imports: [IconComponent],
  host: {
    class: 'btn btn-red',
    '(click)': 'onClick()'
  },
  template: '<m-icon icon="flag-outline"/>'
})
export class ReportButtonComponent {
  private readonly dialogService = inject(DialogService);

  readonly reportType = input<ReportType>();
  readonly reportData = input<string>();

  onClick() {
    this.dialogService.open(CreateReportDialogComponent, {
      header: 'Submit Report',
      data: { reportData: this.reportData(), reportType: this.reportType() }
    });
  }
}
