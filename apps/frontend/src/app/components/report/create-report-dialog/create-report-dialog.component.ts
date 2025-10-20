import { Component, Input, OnInit, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ReportCategory, ReportType } from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';

import { ReportService } from '../../../services/data/report.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Select } from 'primeng/select';

@Component({
  selector: 'm-create-report-dialog',
  templateUrl: './create-report-dialog.component.html',
  imports: [SelectModule, ReactiveFormsModule, Select]
})
export class CreateReportDialogComponent implements OnInit {
  protected readonly ref = inject(DynamicDialogRef);
  private readonly nnfb = inject(NonNullableFormBuilder);
  private readonly reportService = inject(ReportService);
  private readonly messageService = inject(MessageService);

  protected readonly Categories = [
    {
      value: ReportCategory.INAPPROPRIATE_CONTENT,
      label: 'Inappropriate Content'
    },
    { value: ReportCategory.SPAM, label: 'Spam' },
    { value: ReportCategory.PLAGIARISM, label: 'Plagiarism' },
    { value: ReportCategory.OTHER, label: 'Other' }
  ];

  @Input() reportType: ReportType;
  @Input() reportData: number;

  protected readonly createReportForm = this.nnfb.group({
    data: this.nnfb.control<number>(0, { validators: Validators.required }),
    type: this.nnfb.control<ReportType>(ReportType.USER_PROFILE_REPORT, {
      validators: Validators.required
    }),
    category: this.nnfb.control<ReportCategory>(
      ReportCategory.INAPPROPRIATE_CONTENT,
      { validators: Validators.required }
    ),
    message: this.nnfb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(1000)]
    })
  });

  ngOnInit() {
    this.createReportForm.patchValue({
      type: this.reportType,
      data: this.reportData
    });
  }

  submit() {
    this.reportService
      .createReport(
        this.createReportForm.value as Required<
          typeof this.createReportForm.value
        >
      )
      .subscribe({
        next: () => {
          this.createReportForm.reset();
          this.ref.close();
          this.messageService.add({
            severity: 'success',
            summary: 'Report submitted!'
          });
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to submit report: ${httpError.error.message}`
          });
        }
      });
  }
}
