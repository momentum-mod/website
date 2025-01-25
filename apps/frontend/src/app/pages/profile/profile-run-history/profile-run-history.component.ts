import { Component, Input, OnInit } from '@angular/core';
import { merge, Observable, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Order, PastRun, RunsGetAllOrder, User } from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { PaginatorModule } from 'primeng/paginator';
import { PaginatorState } from 'primeng/paginator/paginator.interface';
import { SharedModule } from '../../../shared.module';
import { PastRunsService } from '../../../services/data/past-runs.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'm-profile-run-history',
  templateUrl: './profile-run-history.component.html',
  imports: [SharedModule, DropdownModule, PaginatorModule]
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

  // TODO: Subject/BehaviorSubject
  @Input() userSubject: Observable<User>;
  userID: number;
  runs: PastRun[] = [];
  showFilters = false;

  protected readonly rows = 10;
  protected totalRecords = 0;
  protected first = 0;

  protected loading: boolean;
  protected readonly load = new Subject<void>();
  protected readonly pageChange = new Subject<PaginatorState>();

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
      this.userID = user.id;
      this.load.next();
    });

    merge(
      this.load,
      this.pageChange.pipe(tap(({ first }) => (this.first = first)))
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.pastRunsService.getRuns({
            userID: this.userID,
            expand: ['map'],
            mapName: this.currentFilter.map,
            isPB: this.currentFilter.isPB,
            orderBy: this.currentFilter.orderBy,
            order: this.currentFilter.order,
            take: this.rows,
            skip: this.first
          })
        ),
        tap(() => (this.loading = false))
      )
      .subscribe({
        next: (response) => {
          this.totalRecords = response.totalCount;
          this.runs = response.data;
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot get user runs',
            detail: httpError.error.message
          })
      });
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
    this.first = 0;
    this.load.next();
  }
}
