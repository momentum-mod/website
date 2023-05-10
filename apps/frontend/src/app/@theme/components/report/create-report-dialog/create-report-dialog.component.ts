import { Component, Input, OnInit } from '@angular/core';
import { ReportType } from '../../../../@core/models/report-type.model';
import { NbDialogRef, NbToastrService } from '@nebular/theme';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReportService } from '../../../../@core/data/report.service';
import { ReportCategory } from '../../../../@core/models/report-category.model';

@Component({
  selector: 'mom-create-report-dialog',
  templateUrl: './create-report-dialog.component.html',
  styleUrls: ['./create-report-dialog.component.scss']
})
export class CreateReportDialogComponent implements OnInit {
  @Input() reportType: ReportType;
  @Input() reportData: string;
  ReportCategory: typeof ReportCategory;
  createReportForm: FormGroup;

  constructor(
    protected ref: NbDialogRef<CreateReportDialogComponent>,
    private fb: FormBuilder,
    private reportService: ReportService,
    private toastService: NbToastrService
  ) {
    this.ReportCategory = ReportCategory;
    this.createReportForm = this.fb.group({
      data: ['', Validators.required],
      type: ['', Validators.required],
      category: ['', Validators.required],
      message: ['', [Validators.required, Validators.maxLength(1000)]]
    });
  }

  ngOnInit() {
    this.createReportForm.patchValue({
      type: this.reportType,
      data: this.reportData.toString()
    });
  }

  cancel() {
    this.ref.close();
  }

  submit() {
    this.reportService.createReport(this.createReportForm.value).subscribe({
      next: () => {
        this.createReportForm.reset();
        this.ref.close();
        this.toastService.success('Report submitted');
      },
      error: (error) => {
        console.error(error);
        this.toastService.danger(
          `Failed to submit report: ${error.error.error.message}`,
          'Error'
        );
      }
    });
  }
}
