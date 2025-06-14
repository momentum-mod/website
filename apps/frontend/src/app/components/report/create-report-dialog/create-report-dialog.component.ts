import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReportCategory, ReportType } from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { DropdownModule } from 'primeng/dropdown';

import { ReportService } from '../../../services/data/report.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Select } from 'primeng/select';

@Component({
  selector: 'm-create-report-dialog',
  templateUrl: './create-report-dialog.component.html',
  imports: [DropdownModule, ReactiveFormsModule, Select]
})
export class CreateReportDialogComponent implements OnInit {
  protected readonly ref = inject(DynamicDialogRef);
  private readonly fb = inject(FormBuilder);
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

  protected readonly createReportForm = this.fb.group({
    data: [0, Validators.required],
    type: [ReportType.USER_PROFILE_REPORT, Validators.required],
    category: [ReportCategory.INAPPROPRIATE_CONTENT, Validators.required],
    message: ['', [Validators.required, Validators.maxLength(1000)]]
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
