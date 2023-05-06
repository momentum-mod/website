import { Component } from '@angular/core';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { AdminService } from '../../../../@core/data/admin.service';
import { ConfirmDialogComponent } from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';
import { FormControl, FormGroup } from '@angular/forms';

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
      .subscribe(
        (res) => {
          this.toasterService.success(
            'Successfully reset cosmetic XP globally'
          );
        },
        (err) => {
          this.toasterService.danger('Failed to reset cosmetic XP globally');
        }
      );
  }

  resetRankXPGobally() {
    this.adminService
      .updateAllUserStats({
        rankXP: 0
      })
      .subscribe(
        (res) => {
          this.toasterService.success('Successfully reset rank XP globally');
        },
        (err) => {
          this.toasterService.danger('Failed to reset rank XP globally');
        }
      );
  }

  createUser() {
    if (!this.userForm.valid) return;
    this.adminService.createUser(this.alias.value).subscribe(
      (res) => {
        if (res.alias && res.alias === this.alias.value) {
          this.toasterService.success('Successfully created user!');
          this.userForm.reset();
        }
      },
      (err) => {
        this.toasterService.danger('Failed to create user!');
      }
    );
  }
}
