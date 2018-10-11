import {Component} from '@angular/core';
import {LocalDataSource} from 'ng2-smart-table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import {UsersService} from '../../../@core/data/users.service';
import { CommunityHomeComponent } from './community-home/community-home.component';

@Component({
  selector: 'app-user-list',
  templateUrl: './community-list.component.html',
  styles: [`
    nb-card {
      transform: translate3d(0, 0, 0);
    }
  `],
})
export class CommunityListComponent {

  settings = {
    mode: 'external',
    actions: {
      add: false,
      edit: false,
      delete: false,
    },
    columns: {

      avatarUrl: {
        title: '',
        type: 'html',
        valuePrepareFunction: (photo: string) => `<img width="50px" src="${photo}" />`,
        filter: false,
      },
      alias: {
        title: 'Alias',
        type: 'string',
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
        avatarURL: '../assets/images/kate.png', alias: 'Kate',
      }, {avatarURL: '../assets/images/jack.png', alias: 'Jack',
      }, {avatarURL: '../assets/images/eva.png', alias: 'Eva',
      },
      ]);
    });
  }


  onEdit(event): void {
    const activeModal = this.modalService.open(CommunityHomeComponent, { size: 'lg' });
    activeModal.componentInstance.loadUserData(event.data);
  }
}
