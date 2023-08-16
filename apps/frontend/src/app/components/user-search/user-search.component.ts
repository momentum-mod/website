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
import { User } from '@momentum/constants';
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

  get isSteamId() {
    return (
      typeof this.userSearchForm.get('search').value == 'string' &&
      this.userSearchForm.get('search').value.startsWith('steam:')
    );
  }

  foundUsers: User[];

  pageLimit: number;
  userSearchCount: number;
  userSearchPage: number;

  @Output() selectedUserEmit: EventEmitter<User>;
  @ViewChild('searchInput', { static: true }) searchInput: ElementRef;
  constructor(private fb: FormBuilder, private usersService: UsersService) {
    this.selectedUserEmit = new EventEmitter<User>();
    this.foundUsers = [];
    this.pageLimit = 5;
    this.userSearchCount = 0;
    this.userSearchPage = 1;
  }

  findUsers(val: string) {
    val = val.trim();
    if (val.length > 0)
      if (
        val.startsWith('steam:') &&
        !Number.isNaN(Number.parseInt(val.slice(6)))
      )
        this.usersService
          .getUsers({
            steamID: val.slice(6)
          })
          .subscribe((resp) => {
            this.foundUsers = resp.data;
            this.userSearchCount = resp.totalCount;
          });
      else
        this.usersService
          .getUsers({
            search: val,
            take: this.pageLimit,
            skip: (this.userSearchPage - 1) * this.pageLimit
          })
          .subscribe((resp) => {
            this.foundUsers = resp.data;
            this.userSearchCount = resp.totalCount;
          });
    else {
      this.foundUsers = [];
      this.userSearchPage = 1;
      this.userSearchCount = 0;
    }
  }

  ngOnInit() {
    this.searchInput.nativeElement.focus();
    this.nameSearch.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((val: string) => this.findUsers(val));
  }

  confirmUser(user: User) {
    this.selectedUserEmit.emit(user);
  }

  onPageChange(pageNum) {
    this.userSearchPage = pageNum;
    this.findUsers(this.nameSearch.value);
  }
}
