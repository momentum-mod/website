import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Order, PastRun, RunsGetAllOrder, User } from '@momentum/constants';
import { PastRunsService } from '@momentum/frontend/data';
import { SharedModule } from '../../../shared.module';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'm-profile-run-history',
  templateUrl: './profile-run-history.component.html',
  standalone: true,
  imports: [SharedModule, DropdownModule]
})
export class ProfileRunHistoryComponent implements OnInit {
  protected readonly OrderByDropdown = [
    { label: 'Sort by Date', type: RunsGetAllOrder.DATE },
    { label: 'Sort by Time', type: RunsGetAllOrder.RUN_TIME }
  ];

  protected readonly OrderDropdown = [
    { label: 'Ascending', type: Order.ASC },
    { label: 'Descending', type: Order.DESC }
  ];

  @Input() userSubject: Observable<User>;
  user: User;
  runHistory: PastRun[] = [];
  loadedRuns = false;
  pageLimit = 10;
  currentPage = 1;
  runCount = 10;
  showFilters = false;

  filterFG: FormGroup = this.fb.group({
    isPersonalBest: [false],
    map: [''],
    orderBy: [RunsGetAllOrder.DATE],
    order: [Order.DESC]
  });

  currentFilter: {
    isPB: boolean;
    map: string;
    orderBy: RunsGetAllOrder;
    order: Order;
  } = {
    isPB: this.filterFG.value.isPersonalBest,
    map: this.filterFG.value.map,
    orderBy: this.filterFG.value.orderBy,
    order: this.filterFG.value.order
  };

  constructor(
    private readonly pastRunsService: PastRunsService,
    private readonly messageService: MessageService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit() {
    this.userSubject.subscribe((user) => {
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
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot get user map credits',
            detail: error.message
          })
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
