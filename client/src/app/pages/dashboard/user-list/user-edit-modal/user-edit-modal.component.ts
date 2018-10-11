import { Component, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { User, UsersService } from '../../../../@core/data/users.service';
import { Permission } from '../../../../@core/data/local-user.service';

@Component({
  selector: 'ngx-modal',
  templateUrl: './user-edit-modal.component.html',
})
export class UserEditModalComponent {
  @Output() onEditSuccess: EventEmitter<any> = new EventEmitter();

  form = {
    id: '',
    alias: '',
    avatarUrl: '',
    createdAt: '',
    perms: {
      mapper: { checked: false, value: Permission.MAPPER },
      moderator: { checked: false, value: Permission.MODERATOR },
      admin: { checked: false, value: Permission.ADMIN },
      leaderboardBanned: { checked: false, value: Permission.BANNED_LEADERBOARDS },
      aliasBanned: { checked: false, value: Permission.BANNED_ALIAS },
      avatarBanned: { checked: false, value: Permission.BANNED_AVATAR },
    },
  };

  constructor(private activeModal: NgbActiveModal, private usersService: UsersService) { }

  loadUserData(userData) {
    Object.assign(this.form, userData);
    for (const perm in this.form.perms) {
      if (this.form.perms[perm].value & userData.permissions) {
        this.form.perms[perm].checked = true;
      }
    }
  }

  onSubmit() {
    const user = this.convertInputToUser();
    this.usersService.updateUser(user).subscribe(data => {
      user.createdAt = this.form.createdAt;
      user.updatedAt = new Date().toISOString();
      this.onEditSuccess.emit(user);
    }, error => {
      alert(error.message); // TODO: replace with toaster!!! :)
    });
  }

  convertInputToUser(): User {
    const user = {
      id: this.form.id,
      permissions: 0,
      profile: {
        id: this.form.id,
        alias: this.form.alias,
        avatarURL: this.form.avatarUrl,
      },
    };
    for (const perm in this.form.perms) {
      if (this.form.perms[perm].checked) {
        user.permissions |= this.form.perms[perm].value;
      }
    }
    return user;
  }

  closeModal() {
    this.activeModal.close();
  }
}
