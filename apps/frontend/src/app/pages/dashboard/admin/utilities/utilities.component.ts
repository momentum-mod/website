import { Component } from '@angular/core';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { ConfirmDialogComponent } from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';
import { FormControl, FormGroup } from '@angular/forms';
import { AdminService } from '@momentum/frontend/data';

@Component({
  selector: 'mom-utilities',
  templateUrl: './utilities.component.html',
  styleUrls: ['./utilities.component.scss']
})
export class UtilitiesComponent {
  userForm: FormGroup = new FormGroup({
    alias: new FormControl('')
  });
  get alias() {
    return this.userForm.get('alias');
  }
  constructor(
    private adminService: AdminService,
    private toasterService: NbToastrService,
    private dialogService: NbDialogService
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
          this.toasterService.success(
            'Successfully reset cosmetic XP globally'
          ),
        error: () =>
          this.toasterService.danger('Failed to reset cosmetic XP globally')
      });
  }

  resetRankXPGobally() {
    this.adminService.updateAllUserStats({ rankXP: 0 }).subscribe({
      next: () =>
        this.toasterService.success('Successfully reset rank XP globally'),
      error: () =>
        this.toasterService.danger('Failed to reset rank XP globally')
    });
  }

  createUser() {
    if (!this.userForm.valid) return;
    this.adminService.createUser(this.alias.value).subscribe({
      next: (response) => {
        if (response.alias && response.alias === this.alias.value) {
          this.toasterService.success('Successfully created user!');
          this.userForm.reset();
        }
      },
      error: () => this.toasterService.danger('Failed to create user!')
    });
  }
}
