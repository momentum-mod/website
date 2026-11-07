import { Component, OnInit, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MAX_REPORT_MESSAGE_LENGTH,
  ReportCategory,
  ReportType
} from '@momentum/constants';
import { MessageService } from '@openng/optimus-ui/api';
import {
  DynamicDialogConfig,
  DynamicDialogRef
} from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { ReportService } from '../../../services/data/report.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Select } from '@openng/optimus-ui/select';

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

  // DynamicDialog passes data via DynamicDialogConfig.data, not inputs.
  private readonly config =
    inject<DynamicDialogConfig<{ reportType: ReportType; reportData: number }>>(
      DynamicDialogConfig
    );

  protected readonly MAX_REPORT_MESSAGE_LENGTH = MAX_REPORT_MESSAGE_LENGTH;

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
      validators: [
        Validators.required,
        Validators.maxLength(MAX_REPORT_MESSAGE_LENGTH)
      ]
    })
  });

  ngOnInit() {
    this.createReportForm.patchValue({
      type: this.config.data?.reportType,
      data: this.config.data?.reportData
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
