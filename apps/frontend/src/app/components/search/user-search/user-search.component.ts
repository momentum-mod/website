import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '@momentum/frontend/data';
import { User } from '@momentum/constants';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import {
  NbPopoverDirective,
  NbFormFieldModule,
  NbPopoverModule,
  NbSpinnerModule,
  NbInputModule
} from '@nebular/theme';
import { merge, of, Subject } from 'rxjs';
import { PagedResponseDto } from '@momentum/backend/dto';
import { showPopover } from '../../../utils/popover-utils';
import { NgxPaginationModule } from 'ngx-pagination';
import { UserSearchResultComponent } from './user-search-result.component';
import { NgClass, NgFor } from '@angular/common';
import { IconComponent } from '@momentum/frontend/icons';

@Component({
  selector: 'mom-user-search',
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
    NgxPaginationModule
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
  protected readonly pageChange = new Subject<number>();
  private readonly stopSearch = new Subject<void>();

  searchBySteam = false;
  foundUsers: User[] = [];
  userSearchCount = 0;
  userSearchPage = 1;

  readonly pageSize = 5;

  @ViewChild(NbPopoverDirective) readonly popover: NbPopoverDirective;

  ngOnInit() {
    this.search.statusChanges.subscribe((status) => {
      if (status !== 'INVALID') {
        this.popover.hide();
        return;
      }
      showPopover(
        this.popover,
        Object.values(this.search.errors)[0] ?? 'Unknown error'
      );
    });

    merge(
      this.pageChange.pipe(
        filter((page) => page !== this.userSearchPage),
        tap((page: number) => (this.userSearchPage = page))
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
                skip: (this.userSearchPage - 1) * this.pageSize
              })
              .pipe(takeUntil(this.stopSearch));
        })
      )
      .subscribe({
        next: (response: PagedResponseDto<User> | null) => {
          if (!response) {
            this.resetSearchData();
          } else if (response.returnCount > 0) {
            this.foundUsers = response.data;
            this.userSearchCount = response.totalCount;
            this.search.setErrors(null);
          } else {
            this.resetSearchData();
            this.search.setErrors({ error: 'No users found!' });
          }
        },
        error: (err) => {
          console.log(err);
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
    this.userSearchPage = 1;
    this.userSearchCount = 0;
  }

  protected confirmUser(user: User) {
    this.userSelected.emit(user);
  }
}
