import { Component, OnInit, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AdminService } from '../../../services/data/admin.service';
import * as Enum from '@momentum/enum';
import {
  KillswitchType,
  Killswitches,
  MAX_ADMIN_ANNOUNCEMENT_LENGTH
} from '@momentum/constants';
import { DialogService } from 'primeng/dynamicdialog';
import { CodeVerifyDialogComponent } from '../../../components/dialogs/code-verify-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { CardComponent } from '../../../components/card/card.component';
import { DynamicTextareaHeightDirective } from '../../../directives/dynamic-textarea-height.directive';
import { ConfirmDialogComponent } from '../../../components/dialogs/confirm-dialog.component';
import { PluralPipe } from '../../../pipes/plural.pipe';

@Component({
  selector: 'm-utilities',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    DynamicTextareaHeightDirective,
    PluralPipe
  ],
  templateUrl: './utilities.component.html'
})
export class UtilitiesComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly nnfb = inject(NonNullableFormBuilder);

  protected readonly KillswitchTypes = Enum.values(KillswitchType);
  protected readonly MAX_ADMIN_ANNOUNCEMENT_LENGTH =
    MAX_ADMIN_ANNOUNCEMENT_LENGTH;

  protected readonly userForm = this.nnfb.group({
    alias: this.nnfb.control('', [Validators.required])
  });
  protected readonly killswitchForm = this.nnfb.group(
    Object.fromEntries(
      this.KillswitchTypes.map((type) => [type, this.nnfb.control(false)])
    )
  );
  protected readonly announcementForm = this.nnfb.group({
    message: this.nnfb.control('', [
      Validators.required,
      Validators.minLength(20), // Reasonable length to require some context.
      Validators.maxLength(MAX_ADMIN_ANNOUNCEMENT_LENGTH)
    ])
  });

  ngOnInit() {
    this.adminService.getKillswitches().subscribe({
      next: (killswiches) => {
        this.killswitchForm.setValue(killswiches);
      },
      error: (httpError: HttpErrorResponse) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to get killswitches!',
          detail: httpError.error.message
        });
      }
    });
  }

  showKillswitchesVerifyDialog() {
    this.dialogService
      .open(CodeVerifyDialogComponent, {
        header: 'Update killswitches',
        data: {
          message: `
          <p>
            Killswitches <b>directly</b> affect the operation of the backend.
          </p>
          <p>
            They should <b>only</b> be used in case of critical situations.
          </p>
          <p>
            Make sure you actually know what you are doing.
          </p>`,
          actionText: 'Update'
        }
      })
      .onClose.subscribe((shouldProceed) => {
        if (!shouldProceed) return;
        this.updateKillswitches();
      });
  }

  updateKillswitches() {
    this.adminService
      .updateKillswitches(this.killswitchForm.value as Killswitches)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successfully updated killswiches!'
          });
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to updated killswitches!',
            detail: httpError.error.message
          });
        }
      });
  }

  createUser() {
    this.dialogService
      .open(ConfirmDialogComponent, {
        header: 'Create Placeholder?',
        data: {
          message: 'Confirm the creation of a placeholder user',
          abortMessage: 'Cancel',
          proceedMessage: 'Create Placeholder'
        }
      })
      .onClose.subscribe((shouldProceed) => {
        if (!shouldProceed) return;

        this.adminService.createUser(this.alias.value).subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Successfully created placeholder!',
              detail: `Placeholder user named ${response.alias} has been created`
            });
          },
          error: (httpError: HttpErrorResponse) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Failed to create placeholder!',
              detail: httpError.error.message
            })
        });

        this.userForm.reset();
      });
  }

  makeAnnouncement() {
    this.dialogService
      .open(ConfirmDialogComponent, {
        header: 'Create announcement?',
        data: {
          message:
            'This will send out a notification to ALL users. Are you sure you want to create the announcement?',
          abortMessage: 'Cancel',
          proceedMessage: 'Create Announcement'
        }
      })
      .onClose.subscribe((shouldProceed) => {
        if (!shouldProceed) return;

        this.adminService
          .createAnnouncement({ message: this.message.value })
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Sent an announcement to everyone'
              });
            },
            error: (httpError: HttpErrorResponse) =>
              this.messageService.add({
                summary: 'Failed to send announcement',
                detail: httpError.error.message
              })
          });

        this.announcementForm.reset();
      });
  }

  get alias() {
    return this.userForm.get('alias');
  }

  get message() {
    return this.announcementForm.get('message');
  }
}
