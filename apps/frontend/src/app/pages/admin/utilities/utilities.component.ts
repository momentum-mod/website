import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AdminService } from '../../../services/data/admin.service';
import * as Enum from '@momentum/enum';
import { KillswitchType, Killswitches } from '@momentum/constants';
import { DialogService } from 'primeng/dynamicdialog';
import { CodeVerifyDialogComponent } from '../../../components/dialogs/code-verify-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { CardComponent } from '../../../components/card/card.component';

@Component({
  selector: 'm-utilities',
  imports: [CardComponent, ReactiveFormsModule],
  templateUrl: './utilities.component.html'
})
export class UtilitiesComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);

  protected readonly KillswitchTypes = Enum.values(KillswitchType);

  protected readonly userForm = new FormGroup({
    alias: new FormControl('')
  });

  protected readonly killswitchForm = new FormGroup(
    Object.fromEntries(
      this.KillswitchTypes.map((type) => [type, new FormControl(false)])
    )
  );

  get alias() {
    return this.userForm.get('alias');
  }

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
    if (!this.killswitchForm.valid) return;
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
      .onClose.subscribe((response) => {
        if (!response) return;
        this.updateKillswitches();
      });
  }

  updateKillswitches() {
    if (!this.killswitchForm.valid) return;
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
    if (!this.userForm.valid) return;
    this.adminService.createUser(this.alias.value).subscribe({
      next: (response) => {
        if (response.alias && response.alias === this.alias.value) {
          this.messageService.add({
            severity: 'success',
            summary: 'Successfully created user!'
          });
          this.userForm.reset();
        }
      },
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to create user!',
          detail: httpError.error.message
        })
    });
  }
}
