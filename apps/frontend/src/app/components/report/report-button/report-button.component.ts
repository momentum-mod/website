import {
  Component,
  HostBinding,
  HostListener,
  Input,
  inject
} from '@angular/core';
import { ReportType } from '@momentum/constants';
import { DialogService } from 'primeng/dynamicdialog';
import { CreateReportDialogComponent } from '../create-report-dialog/create-report-dialog.component';
import { IconComponent } from '../../../icons';

@Component({
  selector: 'm-report-button',
  imports: [IconComponent],
  template: '<m-icon icon="flag-outline"/>'
})
export class ReportButtonComponent {
  private readonly dialogService = inject(DialogService);

  @Input() reportType: ReportType;
  @Input() reportData: string;

  @HostBinding('class') get classes() {
    return 'btn btn-red';
  }

  @HostListener('click')
  onClick() {
    this.dialogService.open(CreateReportDialogComponent, {
      header: 'Submit Report',
      data: { reportData: this.reportData, reportType: this.reportType }
    });
  }
}
