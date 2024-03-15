import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../shared.module';
import { AdminService } from '../../../services/data/admin.service';

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
