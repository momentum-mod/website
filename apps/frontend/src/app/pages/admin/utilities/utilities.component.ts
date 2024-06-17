import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../shared.module';
import { AdminService } from '../../../services/data/admin.service';
import { Enum } from '@momentum/enum';
import { KillswitchType, Killswitches } from '@momentum/constants';
import { DialogService } from 'primeng/dynamicdialog';
import { CodeVerifyDialogComponent } from '../../../components/dialogs/code-verify-dialog.component';

@Component({
  selector: 'm-utilities',
  templateUrl: './utilities.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class UtilitiesComponent implements OnInit {
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

  constructor(
    private readonly adminService: AdminService,
    private readonly messageService: MessageService,
    private readonly dialogService: DialogService
  ) {}

  ngOnInit() {
    this.adminService.getKillswitches().subscribe({
      next: (killswiches) => {
        this.killswitchForm.setValue(killswiches);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to get killswitches!'
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
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to updated killswitches!'
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
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to create user!'
        })
    });
  }
}
