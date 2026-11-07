import { Component, OnInit, inject, signal } from '@angular/core';
import { switchMap, tap } from 'rxjs/operators';
import { ReportType, Report } from '@momentum/constants';
import { MessageService } from '@openng/optimus-ui/api';
import { PaginatorModule } from '@openng/optimus-ui/paginator';
import { merge, of, Subject } from 'rxjs';
import { PaginatorState } from '@openng/optimus-ui/paginator';
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

  protected readonly reportQueue = signal<Report[]>([]);
  protected readonly resolved = signal<'true' | 'false'>('false');

  protected readonly rows = 10;
  protected readonly totalRecords = signal(0);
  protected readonly first = signal(0);

  protected readonly loading = signal(false);
  protected readonly pageChange = new Subject<PaginatorState>();
  protected readonly refresh = new Subject<void>();
  protected readonly filterChange = new Subject<void>();

  ngOnInit() {
    merge(
      of(null),
      this.refresh,
      this.filterChange.pipe(
        tap(() => {
          this.first.set(0);
          this.totalRecords.set(0);
        })
      ),
      this.pageChange.pipe(tap(({ first }) => this.first.set(first)))
    )
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(() =>
          this.adminService.getReports({
            expand: ['submitter', 'resolver'],
            resolved: this.resolved() === 'true',
            take: this.rows,
            skip: this.first()
          })
        )
      )
      .subscribe({
        next: (response) => {
          this.totalRecords.set(response.totalCount);
          this.reportQueue.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error(error);
          this.toasterService.add({
            severity: 'error',
            summary: 'Failed to load report queue',
            detail: error.message
          });
          this.loading.set(false);
        }
      });
  }
}
