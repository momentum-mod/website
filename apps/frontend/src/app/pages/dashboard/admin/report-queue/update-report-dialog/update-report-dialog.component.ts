import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Report } from '../../../../../@core/models/report.model';
import { NbDialogRef, NbToastrService } from '@nebular/theme';
import { AdminService } from '../../../../../@core/data/admin.service';

@Component({
  selector: 'mom-update-report-dialog',
  templateUrl: './update-report-dialog.component.html',
  styleUrls: ['./update-report-dialog.component.scss']
})
export class UpdateReportDialogComponent implements OnInit {
  @Input() report: Report;
  updateReportForm: FormGroup;

  constructor(
    private ref: NbDialogRef<UpdateReportDialogComponent>,
    private fb: FormBuilder,
    private adminService: AdminService,
    private toastService: NbToastrService
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
          this.toastService.success('Report has been updated');
        },
        error: (error) => {
          this.toastService.danger(
            error.message,
            'Failed to update the report'
          );
        }
      });
  }
}
