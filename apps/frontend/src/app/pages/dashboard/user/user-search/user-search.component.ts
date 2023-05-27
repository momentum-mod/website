import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UsersService } from '@momentum/frontend/data';
import { User } from '@momentum/types';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'mom-user-search',
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss']
})
export class UserSearchComponent implements OnInit {
  userSearchForm: FormGroup = this.fb.group({ search: [''] });
  get nameSearch() {
    return this.userSearchForm.get('search');
  }

  foundUsers: User[];

  @Output() selectedUserEmit: EventEmitter<User>;
  @ViewChild('searchInput', { static: true }) searchInput: ElementRef;
  constructor(private fb: FormBuilder, private usersService: UsersService) {
    this.selectedUserEmit = new EventEmitter<User>();
    this.foundUsers = [];
  }

  ngOnInit() {
    this.searchInput.nativeElement.focus();
    this.nameSearch.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((val: string) => {
        val = val.trim();
        if (val.length > 0)
          this.usersService
            .getUsers({ search: val, take: 5 })
            .subscribe((resp) => (this.foundUsers = resp.response));
        else this.foundUsers = [];
      });
  }

  confirmUser(user: User) {
    this.selectedUserEmit.emit(user);
  }
}
