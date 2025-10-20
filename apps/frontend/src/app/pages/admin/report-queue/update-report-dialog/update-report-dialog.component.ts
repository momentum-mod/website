import { Component, Input, OnInit, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Report } from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

import { AdminService } from '../../../../services/data/admin.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'm-update-report-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './update-report-dialog.component.html'
})
export class UpdateReportDialogComponent implements OnInit {
  private readonly ref = inject(DynamicDialogRef);
  private readonly nnfb = inject(NonNullableFormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);

  @Input() report: Report;

  updateReportForm = this.nnfb.group({
    resolved: this.nnfb.control<boolean>(false, {
      validators: Validators.required
    }),
    resolutionMessage: this.nnfb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(1000)]
    })
  });

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
      .updateReport(this.report.id, this.updateReportForm.getRawValue())
      .subscribe({
        next: () => {
          this.updateReportForm.reset();
          this.ref.close(this.report);
          this.messageService.add({
            severity: 'success',
            summary: 'Report has been updated'
          });
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update the report',
            detail: httpError.error.message
          });
        }
      });
  }
}
