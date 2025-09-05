import { Component, OnInit, inject } from '@angular/core';
import { switchMap, tap } from 'rxjs/operators';
import { ReportType, Report } from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import { merge, of, Subject } from 'rxjs';
import { PaginatorState } from 'primeng/paginator';

import { QueuedReportComponent } from './queued-report/queued-report.component';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { AdminService } from '../../../services/data/admin.service';
import { CardComponent } from '../../../components/card/card.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'm-report-queue',
  templateUrl: './report-queue.component.html',
  imports: [
    QueuedReportComponent,
    PaginatorModule,
    SpinnerDirective,
    CardComponent,
    FormsModule
  ]
})
export class ReportQueueComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toasterService = inject(MessageService);

  protected readonly ReportType = ReportType;

  reportQueue: Report[] = [];
  filters = { resolved: false };

  protected readonly rows = 5;
  protected totalRecords = 0;
  protected first = 0;

  protected loading: boolean;
  protected readonly pageChange = new Subject<PaginatorState>();
  protected readonly refresh = new Subject<void>();
  protected readonly filterChange = new Subject<void>();

  ngOnInit() {
    merge(
      of(null),
      this.refresh,
      this.filterChange.pipe(
        tap(() => {
          this.first = 0;
          this.totalRecords = 0;
        })
      ),
      this.pageChange.pipe(tap(({ first }) => (this.first = first)))
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.adminService.getReports({
            expand: ['submitter', 'resolver'],
            resolved: this.filters.resolved,
            take: this.rows,
            skip: this.first
          })
        )
      )
      .subscribe({
        next: (response) => {
          this.totalRecords = response.totalCount;
          this.reportQueue = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error(error);
          this.toasterService.add({
            severity: 'error',
            summary: 'Failed to load report queue',
            detail: error.message
          });
          this.loading = false;
        }
      });
  }
}
