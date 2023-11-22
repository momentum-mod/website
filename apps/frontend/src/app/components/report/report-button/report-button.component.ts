import { Component, Input } from '@angular/core';
import { ReportType } from '@momentum/constants';
import { NbDialogService, NbButtonModule, NbIconModule } from '@nebular/theme';
import { CreateReportDialogComponent } from '../create-report-dialog/create-report-dialog.component';
import { NbIconIconDirective } from '../../../../../../../libs/frontend/directives/src/lib/icons/nb-icon-icon.directive';

@Component({
  selector: 'mom-report-button',
  templateUrl: './report-button.component.html',
  styleUrls: ['./report-button.component.scss'],
  standalone: true,
  imports: [NbButtonModule, NbIconModule, NbIconIconDirective]
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
