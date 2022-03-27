import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {UsersService} from '../../../../@core/data/users.service';
import {User} from '../../../../@core/models/user.model';
import {FormBuilder, FormGroup} from '@angular/forms';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';

@Component({
  selector: 'user-search',
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss'],
})
export class UserSearchComponent implements OnInit {

  userSearchForm: FormGroup = this.fb.group({
    'search': [''],
  });
  get nameSearch() { return this.userSearchForm.get('search'); }

  foundUsers: User[];

  @Input() limit: Number;
  @Output() selectedUserEmit: EventEmitter<User>;
  @ViewChild('searchInput', {static: true}) searchInput: ElementRef;
  constructor(private fb: FormBuilder,
              private usersService: UsersService) {
    this.selectedUserEmit = new EventEmitter<User>();
    this.foundUsers = [];
    this.limit = 5;
  }

  ngOnInit() {
    this.searchInput.nativeElement.focus();
    this.nameSearch.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged())
      .subscribe((val: string) => {
        val = val.trim();
        if (val.length > 0) {
          this.usersService.getUsers({
            params: {
              search: val,
              limit: this.limit,
            },
          }).subscribe(resp => {
            this.foundUsers = resp.users;
          });
        } else {
          this.foundUsers = [];
        }
      });
  }

  confirmUser(user: User) {
    this.selectedUserEmit.emit(user);
  }
}
