import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { AdminActivity, AdminActivityType, User } from '@momentum/constants';
import { Subject, merge, of, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import {
  AdminActivityEntryComponent,
  AdminActivityEntryData
} from './admin-activity-entry/admin-activity-entry.component';
import { AdminActivityEntryHeaderComponent } from './admin-activity-entry/admin-activity-entry-header.component';
import { FormControl, FormGroup } from '@angular/forms';
import { UserSelectComponent } from '../../../components/user-select/user-select.component';
import { mapHttpError } from '../../../util/rxjs/map-http-error';
import { AccordionComponent } from '../../../components/accordion/accordion.component';
import { AccordionItemComponent } from '../../../components/accordion/accordion-item.component';
import { UserSearchComponent } from '../../../components/search/user-search.component';
import { AdminActivityService } from '../../../services/data/admin-activity.service';

@Component({
  selector: 'm-admin-activity',
  templateUrl: './admin-activity.component.html',
  standalone: true,
  imports: [
    SharedModule,
    PaginatorModule,
    AdminActivityEntryComponent,
    AdminActivityEntryHeaderComponent,
    AccordionComponent,
    AccordionItemComponent,
    UserSearchComponent,
    UserSelectComponent
  ]
})
export class AdminActivityComponent implements OnInit {
  // prettier-ignore
  protected readonly AdminActivitiesFilters = [
    { value: undefined, text: 'All' },
    { value: AdminActivityType.USER_UPDATE_ROLES, text: 'Roles update' },
    { value: AdminActivityType.USER_UPDATE_BANS, text: 'Bans update' },
    { value: AdminActivityType.USER_UPDATE_ALIAS, text: 'Alias update' },
    { value: AdminActivityType.USER_UPDATE_BIO, text: 'Bio update' },
    { value: AdminActivityType.USER_CREATE_PLACEHOLDER, text: 'Placeholder created' },
    { value: AdminActivityType.USER_MERGE, text: 'User merged' },
    { value: AdminActivityType.USER_DELETE, text: 'User deleted' },
    { value: AdminActivityType.MAP_UPDATE, text: 'Map update' },
    { value: AdminActivityType.MAP_CONTENT_DELETE, text: 'Map deleted' },
    { value: AdminActivityType.REPORT_UPDATE, text: 'Report update' },
    { value: AdminActivityType.REPORT_RESOLVE, text: 'Report resolve' }
  ];

  protected activities: Array<{
    activity: AdminActivity;
    entry: AdminActivityEntryData;
  }> = [];

  protected readonly filters = new FormGroup({
    type: new FormControl<AdminActivityType>(null),
    user: new FormControl<User>(null)
  });

  protected loading: boolean;
  protected readonly pageChange = new Subject<PaginatorState>();

  protected readonly rows = 10;
  protected totalRecords = 0;
  protected first = 0;
  protected filter?: AdminActivityType;

  constructor(
    private readonly adminActivityService: AdminActivityService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit() {
    merge(
      of(null),
      this.filters.valueChanges,
      this.pageChange.pipe(tap(({ first }) => (this.first = first)))
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() => {
          const { type, user } = this.filters.value;
          const query = {
            take: this.rows,
            skip: this.first,
            filter: type ?? undefined
          };
          if (user) {
            return this.adminActivityService.getAdminActivitiesForUser(
              user.id,
              query
            );
          } else {
            return this.adminActivityService.getAdminActivities(query);
          }
        }),
        mapHttpError(400, { data: [], totalCount: -1, returnCount: 0 }),
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
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to load admin activity',
            detail: error.message
          });
          this.activities = [];
          this.totalRecords = 0;
        }
      });
  }
}
