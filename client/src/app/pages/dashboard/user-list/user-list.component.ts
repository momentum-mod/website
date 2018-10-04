import {Component} from '@angular/core';
import {LocalDataSource} from 'ng2-smart-table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import {UsersService} from '../../../@core/data/users.service';
import { UserEditModalComponent } from './user-edit-modal/user-edit-modal.component';

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
    mode: 'external',
    actions: {
      add: false,
      delete: false,
    },
    edit: {
      editButtonContent: '<i class="nb-edit"></i>',
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
      avatarUrl: {
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
      permissions: {
        title: 'Permissions',
        type: 'number',
      },
    },
  };

  source: LocalDataSource = new LocalDataSource();

  constructor(private usersService: UsersService, private modalService: NgbModal) {
    this.usersService.getUsers().subscribe(data => {
      if (data) {
        this.source.load(data);
      }
    }, error => {
      this.source.load([{
        id: '25474197999996633',
        alias: 'Cate',
        permissions: 6,
        avatarUrl: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/13/' +
          '13d6e1103950ab69d6eec0c7758897887a05c08c_full.jpg',
        createdAt: '2018-09-27T07:29:17.000Z',
        updatedAt: '2018-09-27T07:29:17.000Z',
      }]);
    });
  }

  onEdit(event): void {
    const activeModal = this.modalService.open(UserEditModalComponent, { size: 'lg' });
    activeModal.componentInstance.loadUserData(event.data);
    activeModal.componentInstance.onEditSuccess.subscribe(newUserData => {
      event.setData(newUserData);
      activeModal.close();
    });
  }
}
