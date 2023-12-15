import { Component, Input, OnInit } from '@angular/core';
import { NbSelectModule, NbOptionModule } from '@nebular/theme';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { ReportService } from '@momentum/frontend/data';
import { ReportCategory, ReportType } from '@momentum/constants';
import { CardComponent } from '../../card/card.component';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'm-create-report-dialog',
  templateUrl: './create-report-dialog.component.html',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NbSelectModule,
    NbOptionModule,
    CardComponent
  ]
})
export class CreateReportDialogComponent implements OnInit {
  @Input() reportType: ReportType;
  @Input() reportData: number;

  protected readonly createReportForm = this.fb.group({
    data: [0, Validators.required],
    type: [ReportType.USER_PROFILE_REPORT, Validators.required],
    category: [ReportCategory.INAPPROPRIATE_CONTENT, Validators.required],
    message: ['', [Validators.required, Validators.maxLength(1000)]]
  });

  constructor(
    protected readonly ref: DynamicDialogRef,
    private readonly fb: FormBuilder,
    private readonly reportService: ReportService,
    private readonly messageService: MessageService
  ) {}

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
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to submit report: ${error.error.error.message}`
          });
        }
      });
  }
}
