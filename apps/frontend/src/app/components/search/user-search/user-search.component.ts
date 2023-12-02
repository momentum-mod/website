import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '@momentum/frontend/data';
import { PagedResponse, User } from '@momentum/constants';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import {
  NbFormFieldModule,
  NbPopoverModule,
  NbSpinnerModule,
  NbInputModule
} from '@nebular/theme';
import { merge, of, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { UserSearchResultComponent } from './user-search-result.component';
import { NgClass, NgFor } from '@angular/common';
import { IconComponent } from '@momentum/frontend/icons';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { PaginatorState } from 'primeng/paginator/paginator.interface';

@Component({
  selector: 'm-user-search',
  templateUrl: './user-search.component.html',
  standalone: true,
  imports: [
    NbFormFieldModule,
    NbPopoverModule,
    NbSpinnerModule,
    NbInputModule,
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
    NgClass,
    NgFor,
    UserSearchResultComponent,
    NgxPaginationModule,
    TooltipModule,
    PaginatorModule
  ]
})
export class UserSearchComponent implements OnInit {
  constructor(private readonly usersService: UsersService) {}

  /**
   * ngx-pagination can break for multiple instances if they don't have explicit
   * IDs, so each component instance that uses one needs to specify an ID.
   * https://github.com/michaelbromley/ngx-pagination/blob/master/README.md#multiple-instances
   */
  @Input({ required: true }) paginatorID!: string;
  @Output() public readonly userSelected = new EventEmitter<User>();
  public readonly search: FormControl<string> = new FormControl();
  protected readonly pageChange = new Subject<PaginatorState>();
  private readonly stopSearch = new Subject<void>();

  searchBySteam = false;
  foundUsers: User[] = [];

  totalRecords = 0;
  page = 1;

  first = 0;

  protected readonly rows = 5;
  protected readonly pageSize = 5;

  readonly popover: any = {};

  ngOnInit() {
    this.search.statusChanges.subscribe((status) => {
      if (status !== 'INVALID') {
        // this.popover.hide();
        return;
      }
      // showPopover(
      //   this.popover,
      //   Object.values(this.search.errors)[0] ?? 'Unknown error'
      // );
    });

    merge(
      this.pageChange.pipe(
        // filter(({ page }) => page === this.page),
        tap((aaa) => {
          console.log(aaa);
          this.first = aaa.first;
        })
      ),
      this.search.valueChanges.pipe(
        distinctUntilChanged(),
        filter((value) => {
          if (value?.trim().length > 0) return true;
          this.resetSearchData();
          return false;
        }),
        debounceTime(200)
      )
    )
      .pipe(
        switchMap(() => {
          const value = this.search.value;
          this.search.markAsPending();

          if (this.searchBySteam) {
            if (Number.isNaN(+value)) {
              this.search.setErrors({ error: 'Input is not a Steam ID!' });
              return of(null);
            }
            return this.usersService
              .getUsers({ steamID: value })
              .pipe(takeUntil(this.stopSearch));
          } else
            return this.usersService
              .getUsers({
                search: value,
                take: this.pageSize,
                skip: this.first
              })
              .pipe(takeUntil(this.stopSearch));
        })
      )
      .subscribe({
        next: (response: PagedResponse<User> | null) => {
          if (!response) {
            this.resetSearchData();
          } else if (response.returnCount > 0) {
            this.foundUsers = response.data;
            this.totalRecords = response.totalCount;
            this.search.setErrors(null);
          } else {
            this.resetSearchData();
            this.search.setErrors({ error: 'No users found!' });
          }
        },
        error: (err) => {
          console.error(err);
          this.search.setErrors({ error: 'Error fetching users!' });
        }
      });
  }

  public resetSearchBox() {
    this.resetSearchData();
    this.stopSearch.next();
    // emitEvent ... TODO
    this.search.setValue('', { emitEvent: true });
    // this.search.reset();
  }

  protected resetSearchData() {
    this.foundUsers = [];
    this.first = 0;
    this.totalRecords = 0;
  }

  protected confirmUser(user: User) {
    this.userSelected.emit(user);
  }
}
