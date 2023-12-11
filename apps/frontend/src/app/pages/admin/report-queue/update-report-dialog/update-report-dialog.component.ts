import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NbDialogRef } from '@nebular/theme';
import { Report } from '@momentum/constants';
import { AdminService } from '@momentum/frontend/data';
import { SharedModule } from '../../../../shared.module';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-update-report-dialog',
  templateUrl: './update-report-dialog.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class UpdateReportDialogComponent implements OnInit {
  @Input() report: Report;
  updateReportForm: FormGroup;

  constructor(
    private ref: NbDialogRef<UpdateReportDialogComponent>,
    private fb: FormBuilder,
    private adminService: AdminService,
    private messageService: MessageService
  ) {
    this.updateReportForm = this.fb.group({
      resolved: ['', Validators.required],
      resolutionMessage: ['', [Validators.required, Validators.maxLength(1000)]]
    });
  }

  ngOnInit() {
    if (this.report) {
      this.updateReportForm.patchValue({
        resolved: this.report.resolved,
        resolutionMessage: this.report.resolutionMessage
      });
    }
  }

  cancel() {
    this.updateReportForm.reset();
    this.ref.close();
  }

  save() {
    this.adminService
      .updateReport(this.report.id, this.updateReportForm.value)
      .subscribe({
        next: () => {
          this.updateReportForm.reset();
          this.ref.close(this.report);
          this.messageService.add({
            severity: 'success',
            summary: 'Report has been updated'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update the report',
            detail: error.message
          });
        }
      });
  }
}
