import { Component } from '@angular/core';
import { NbDialogService } from '@nebular/theme';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { FormControl, FormGroup } from '@angular/forms';
import { AdminService } from '@momentum/frontend/data';
import { SharedModule } from '../../../shared.module';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-utilities',
  templateUrl: './utilities.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class UtilitiesComponent {
  protected readonly userForm = new FormGroup({
    alias: new FormControl('')
  });

  get alias() {
    return this.userForm.get('alias');
  }

  constructor(
    private readonly adminService: AdminService,
    private readonly messageService: MessageService
  ) {}

  showResetCosXPConfigDialog() {
    this.dialogService
      .open(ConfirmDialogComponent, {
        context: {
          title: 'Are you sure?',
          message:
            'You are about to set the cosmetic XP to 0 for all users. Are you sure you want to proceed?'
        }
      })
      .onClose.subscribe((response) => {
        if (response) {
          this.resetCosmeticXPGlobally();
        }
      });
  }

  showResetRankXPConfirmDialog() {
    this.dialogService
      .open(ConfirmDialogComponent, {
        context: {
          title: 'Are you sure?',
          message:
            'You are about to set the rank XP to 0 for all users. Are you sure you want to proceed?'
        }
      })
      .onClose.subscribe((response) => {
        if (response) {
          this.resetRankXPGobally();
        }
      });
  }

  resetCosmeticXPGlobally() {
    this.adminService
      .updateAllUserStats({
        level: 1,
        cosXP: 0
      })
      .subscribe({
        next: () =>
          this.messageService.add({
            severity: 'success',
            summary: 'Successfully reset cosmetic XP globally'
          }),
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to reset cosmetic XP globally'
          })
      });
  }

  resetRankXPGobally() {
    this.adminService.updateAllUserStats({ rankXP: 0 }).subscribe({
      next: () =>
        this.messageService.add({
          severity: 'success',
          summary: 'Successfully reset rank XP globally'
        }),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to reset rank XP globally'
        })
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
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to create user!'
        })
    });
  }
}
