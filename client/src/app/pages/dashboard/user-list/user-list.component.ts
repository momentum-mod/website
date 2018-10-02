import {Component} from '@angular/core';
import {LocalDataSource} from 'ng2-smart-table';

import {UsersService} from '../../../@core/data/users.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styles: [`
    nb-card {
      transform: translate3d(0, 0, 0);
    }
  `],
})
export class UserListComponent {

  settings = {
    actions: {
      add: false,
      delete: false,
    },
    edit: {
      editButtonContent: '<i class="nb-edit"></i>',
      saveButtonContent: '<i class="nb-checkmark"></i>',
      cancelButtonContent: '<i class="nb-close"></i>',
    },
    columns: {
      id: {
        title: 'Steam ID',
        type: 'number',
        editable: false,
      },
      alias: {
        title: 'Alias',
        type: 'string',
      },
      avatar_url: {
        title: 'Avatar',
        type: 'string',
      },
      createdAt: {
        title: 'Created At',
        type: 'string',
        editable: false,
      },
      updatedAt: {
        title: 'Updated At',
        type: 'string',
        editable: false,
      },
      permission: {
        title: 'Permissions',
        type: 'number',
      },
    },
  };

  source: LocalDataSource = new LocalDataSource();

  constructor(private usersService: UsersService) {
    const data = this.usersService.getUsers();
    if (data) {
      this.source.load(data);
    }
  }

  onDeleteConfirm(event): void {
    if (window.confirm('Are you sure you want to delete?')) {
      event.confirm.resolve();
    } else {
      event.confirm.reject();
    }
  }
}
