import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { SpinnerDirective } from '../../../directives';
import { AdminActivityService } from '../../../services';
import { AdminActivity, AdminActivityType } from '@momentum/constants';
import { Subject, merge, of, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import {
  AdminActivityEntryComponent,
  AdminActivityEntryData
} from './admin-activity-entry/admin-activity-entry.component';
import { AdminActivityEntryHeaderComponent } from './admin-activity-entry/admin-activity-entry-header.component';
import {
  AccordionComponent,
  AccordionItemComponent
} from '../../../components';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'm-admin-activity',
  templateUrl: './admin-activity.component.html',
  standalone: true,
  imports: [
    SharedModule,
    SpinnerDirective,
    PaginatorModule,
    AdminActivityEntryComponent,
    AdminActivityEntryHeaderComponent,
    AccordionComponent,
    AccordionItemComponent
  ]
})
export class AdminActivityComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly adminActivityService: AdminActivityService,
    private readonly toasterService: MessageService
  ) {}

  protected readonly AdminActivitiesFilters = [
    { value: undefined, text: 'All' },
    { value: AdminActivityType.USER_UPDATE_ROLES, text: 'Roles update' },
    { value: AdminActivityType.USER_UPDATE_BANS, text: 'Bans update' },
    { value: AdminActivityType.USER_UPDATE_ALIAS, text: 'Alias update' },
    { value: AdminActivityType.USER_UPDATE_BIO, text: 'Bio update' },
    {
      value: AdminActivityType.USER_CREATE_PLACEHOLDER,
      text: 'Placeholder created'
    },
    { value: AdminActivityType.USER_MERGE, text: 'User merged' },
    { value: AdminActivityType.USER_DELETE, text: 'User deleted' },
    { value: AdminActivityType.MAP_UPDATE, text: 'Map update' },
    { value: AdminActivityType.MAP_DELETE, text: 'Map deleted' },
    { value: AdminActivityType.REPORT_UPDATE, text: 'Report update' },
    { value: AdminActivityType.REPORT_RESOLVE, text: 'Report resolve' }
  ];

  protected activities: Array<{
    activity: AdminActivity;
    entry: AdminActivityEntryData;
  }> = [];

  protected loading: boolean;
  protected readonly pageChange = new Subject<PaginatorState>();
  protected readonly filterChange = new Subject<void>();

  protected readonly rows = 10;
  protected totalRecords = 0;
  protected first = 0;
  protected filter?: AdminActivityType;

  ngOnInit() {
    merge(
      of(null),
      this.filterChange,
      this.pageChange.pipe(tap(({ first }) => (this.first = first)))
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.route.paramMap.pipe(
            switchMap((params) =>
              params.get('adminID')
                ? this.adminActivityService.getAdminActivitiesForUser(
                    Number(params.get('adminID')),
                    {
                      take: this.rows,
                      skip: this.first,
                      filter: this.filter
                    }
                  )
                : this.adminActivityService.getAdminActivities({
                    take: this.rows,
                    skip: this.first,
                    filter: this.filter
                  })
            )
          )
        ),
        tap(() => (this.loading = false))
      )
      .subscribe({
        next: (response) => {
          this.totalRecords = response.totalCount;
          this.activities = response.data.map((activity) => ({
            activity,
            entry: AdminActivityEntryComponent.getActivityData(activity)
          }));
        },
        error: (error) => {
          console.error(error);
          this.toasterService.add({
            severity: 'error',
            summary: 'Failed to load admin activity',
            detail: error.message
          });
        }
      });
  }
}
