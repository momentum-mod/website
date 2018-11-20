import {Component, ElementRef, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import {UsersService} from '../../../../@core/data/users.service';
import {User} from '../../../../@core/models/user.model';
import {FormBuilder, FormGroup} from '@angular/forms';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {ToasterService} from 'angular2-toaster';

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

  @Output() selectedUserEmit: EventEmitter<User>;
  @ViewChild('searchInput') searchInput: ElementRef;
  constructor(private fb: FormBuilder,
              private usersService: UsersService,
              private toastService: ToasterService) {
    this.selectedUserEmit = new EventEmitter<User>();
    this.foundUsers = [];
  }

  ngOnInit() {
    this.searchInput.nativeElement.focus();
    this.nameSearch.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged())
      .subscribe(val => {
        if ((val = val.trim())) {
          this.usersService.searchUsers(val).subscribe(resp => {
            this.foundUsers = resp.users;
          }, error => {
            this.toastService.popAsync('error', 'Cannot retrieve list of users', error.message);
          });
        }
      });
  }

  confirmUser(user: User) {
    this.selectedUserEmit.emit(user);
  }
}
