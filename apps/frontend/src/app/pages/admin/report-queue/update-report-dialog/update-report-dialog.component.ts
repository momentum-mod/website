import { Component, OnInit, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ChatBanType,
  CreateChatBan,
  Report,
  ReportType,
  UpdateReport
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';

import { AdminService } from '../../../../services/data/admin.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'm-update-report-dialog',
  imports: [ReactiveFormsModule, SelectModule],
  templateUrl: './update-report-dialog.component.html'
})
export class UpdateReportDialogComponent implements OnInit {
  private readonly ref = inject(DynamicDialogRef);
  private readonly nnfb = inject(NonNullableFormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);
  private readonly config =
    inject<DynamicDialogConfig<{ report: Report }>>(DynamicDialogConfig);

  // Populated from the dialog config in ngOnInit. PrimeNG's DynamicDialog passes
  // data via DynamicDialogConfig.data, not @Input.
  protected report: Report;

  // null duration => permanent ban
  protected readonly Durations = [
    { value: 24 * 60 * 60 * 1000, label: '1 day' },
    { value: 3 * 24 * 60 * 60 * 1000, label: '3 days' },
    { value: 7 * 24 * 60 * 60 * 1000, label: '1 week' },
    { value: 30 * 24 * 60 * 60 * 1000, label: '30 days' },
    { value: null, label: 'Permanent' }
  ];

  updateReportForm = this.nnfb.group({
    resolved: this.nnfb.control<boolean>(false, {
      validators: Validators.required
    }),
    resolutionMessage: this.nnfb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(1000)]
    }),
    banChat: this.nnfb.control<boolean>(false),
    banVoice: this.nnfb.control<boolean>(false),
    banDuration: this.nnfb.control<number | null>(24 * 60 * 60 * 1000),
    banReason: this.nnfb.control<string>('', {
      validators: Validators.maxLength(1000)
    })
  });

  ngOnInit() {
    this.report = this.config.data.report;

    if (this.isPlayerReport) {
      // Player reports are handled entirely through the ban section: submitting
      // always resolves them and the ban reason doubles as the resolution
      // message, so the standard resolution controls are hidden and their
      // validators must not block submission.
      this.updateReportForm.controls.resolutionMessage.clearValidators();
      this.updateReportForm.controls.resolutionMessage.updateValueAndValidity();
    } else if (this.report) {
      this.updateReportForm.patchValue({
        resolved: this.report.resolved,
        resolutionMessage: this.report.resolutionMessage
      });
    }
  }

  get isPlayerReport(): boolean {
    return this.report?.type === ReportType.PLAYER_REPORT;
  }

  cancel() {
    this.updateReportForm.reset();
    this.ref.close();
  }

  save() {
    const {
      resolved,
      resolutionMessage,
      banChat,
      banVoice,
      banDuration,
      banReason
    } = this.updateReportForm.getRawValue();

    let body: UpdateReport;

    if (this.isPlayerReport) {
      // Submitting a player report always resolves it; the ban reason is reused
      // as the resolution message.
      body = { resolved: true, resolutionMessage: banReason };

      const types = [
        ...(banChat ? [ChatBanType.CHAT] : []),
        ...(banVoice ? [ChatBanType.VOICE] : [])
      ];

      if (types.length > 0) {
        const expiresAt = banDuration
          ? new Date(Date.now() + banDuration).toISOString()
          : null;

        body.bans = types.map(
          (type): CreateChatBan => ({
            type,
            expiresAt,
            reason: banReason || null
          })
        );
      }
    } else {
      body = { resolved, resolutionMessage };
    }

    this.adminService.updateReport(this.report.id, body).subscribe({
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
