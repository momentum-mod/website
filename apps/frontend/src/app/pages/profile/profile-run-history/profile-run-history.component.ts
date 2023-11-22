import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import {
  NbToastrService,
  NbButtonModule,
  NbCheckboxModule,
  NbInputModule,
  NbSelectModule,
  NbOptionModule,
  NbListModule,
  NbIconModule,
  NbPopoverModule
} from '@nebular/theme';
import { Order, PastRun, RunsGetAllOrder, User } from '@momentum/constants';
import { PastRunsService } from '@momentum/frontend/data';
import { TimeAgoPipe } from '../../../../../../../libs/frontend/pipes/src/lib/time-ago.pipe';
import { TimingPipe } from '../../../../../../../libs/frontend/pipes/src/lib/timing.pipe';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterLink } from '@angular/router';
import { NbIconIconDirective } from '../../../../../../../libs/frontend/directives/src/lib/icons/nb-icon-icon.directive';
import { NgIf, NgClass, NgStyle, NgFor } from '@angular/common';

@Component({
  selector: 'mom-profile-run-history',
  templateUrl: './profile-run-history.component.html',
  styleUrls: ['./profile-run-history.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NbButtonModule,
    NgClass,
    NgStyle,
    FormsModule,
    ReactiveFormsModule,
    NbCheckboxModule,
    NbInputModule,
    NbSelectModule,
    NbOptionModule,
    NbListModule,
    NgFor,
    NbIconModule,
    NbIconIconDirective,
    NbPopoverModule,
    RouterLink,
    NgxPaginationModule,
    TimingPipe,
    TimeAgoPipe
  ]
})
export class ProfileRunHistoryComponent implements OnInit {
  protected readonly OrderBy = RunsGetAllOrder;
  protected readonly Order = Order;

  @Input() userSubj: Observable<User>;
  user: User;
  runHistory: PastRun[];
  loadedRuns: boolean;
  pageLimit: number;
  currentPage: number;
  runCount: number;
  showFilters: boolean;
  currentFilter: {
    isPB: boolean;
    map: string;
    orderBy: RunsGetAllOrder;
    order: Order;
  };

  filterFG: FormGroup = this.fb.group({
    isPersonalBest: [false],
    map: [''],
    orderBy: [RunsGetAllOrder.DATE],
    order: [Order.DESC]
  });

  constructor(
    private pastRunsService: PastRunsService,
    private toastService: NbToastrService,
    private fb: FormBuilder
  ) {
    this.loadedRuns = false;
    this.pageLimit = 10;
    this.currentPage = 1;
    this.runCount = 0;
    this.showFilters = false;
    this.runHistory = [];
    this.currentFilter = {
      isPB: this.filterFG.value.isPersonalBest,
      map: this.filterFG.value.map,
      orderBy: this.filterFG.value.orderBy,
      order: this.filterFG.value.order
    };
  }

  ngOnInit() {
    this.userSubj.subscribe((user) => {
      this.user = user;
      this.loadRunHistory();
    });
  }

  loadRunHistory() {
    this.pastRunsService
      .getRuns({
        userID: this.user.id,
        expand: ['map'],
        mapName: this.currentFilter.map,
        isPB: this.currentFilter.isPB,
        orderBy: this.currentFilter.orderBy,
        order: this.currentFilter.order,
        take: this.pageLimit,
        skip: (this.currentPage - 1) * this.pageLimit
      })
      .pipe(finalize(() => (this.loadedRuns = true)))
      .subscribe({
        next: (response) => {
          this.runCount = response.totalCount;
          this.runHistory = response.data;
        },
        error: (error) =>
          this.toastService.danger(error.message, 'Cannot get user map credits')
      });
  }

  onPageChange(pageNum: number) {
    this.currentPage = pageNum;
    this.loadRunHistory();
  }

  onFilterApply() {
    const { isPersonalBest, map, order, orderBy } = this.filterFG.value;
    if (
      // Don't do anything if the filters didn't change
      this.currentFilter.isPB === isPersonalBest &&
      this.currentFilter.map === map &&
      this.currentFilter.orderBy === orderBy &&
      this.currentFilter.order === order
    )
      return;
    this.currentFilter = { isPB: isPersonalBest, map, order, orderBy };
    this.currentPage = 1; // Reset page back to 1 so you don't potentially pull a page past the last filtered page
    this.loadRunHistory();
  }
}
