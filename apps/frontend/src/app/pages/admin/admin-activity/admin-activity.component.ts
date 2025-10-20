import { Component, OnInit, inject } from '@angular/core';
import { AdminActivity, AdminActivityType, User } from '@momentum/constants';
import { Subject, merge, of, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import {
  AdminActivityEntryComponent,
  AdminActivityEntryData
} from './admin-activity-entry/admin-activity-entry.component';
import { AdminActivityEntryHeaderComponent } from './admin-activity-entry/admin-activity-entry-header.component';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule
} from '@angular/forms';
import { UserSelectComponent } from '../../../components/user-select/user-select.component';
import { mapHttpError } from '../../../util/rxjs/map-http-error';
import { AccordionComponent } from '../../../components/accordion/accordion.component';
import { AccordionItemComponent } from '../../../components/accordion/accordion-item.component';
import { HttpErrorResponse } from '@angular/common/http';
import { CardComponent } from '../../../components/card/card.component';
import { MultiSelect } from 'primeng/multiselect';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { AdminService } from '../../../services/data/admin.service';

@Component({
  selector: 'm-admin-activity',
  templateUrl: './admin-activity.component.html',
  imports: [
    PaginatorModule,
    AdminActivityEntryComponent,
    AdminActivityEntryHeaderComponent,
    AccordionComponent,
    AccordionItemComponent,
    UserSelectComponent,
    CardComponent,
    ReactiveFormsModule,
    MultiSelect,
    SpinnerDirective
  ]
})
export class AdminActivityComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);
  private readonly nnfb = inject(NonNullableFormBuilder);

  // prettier-ignore
  protected readonly AdminActivitiesFilters = [
    { value: AdminActivityType.USER_UPDATE, text: 'User update' },
    { value: AdminActivityType.USER_CREATE_PLACEHOLDER, text: 'Placeholder created' },
    { value: AdminActivityType.USER_MERGE, text: 'User merged' },
    { value: AdminActivityType.USER_DELETE, text: 'User deleted' },
    { value: AdminActivityType.MAP_UPDATE, text: 'Map update' },
    { value: AdminActivityType.MAP_CONTENT_DELETE, text: 'Map deleted' },
    { value: AdminActivityType.REPORT_UPDATE, text: 'Report update' },
    { value: AdminActivityType.REPORT_RESOLVE, text: 'Report resolve' },
    { value: AdminActivityType.REVIEW_DELETED, text: 'Review deleted' },
    { value: AdminActivityType.REVIEW_COMMENT_DELETED, text: 'Review comment deleted' }
  ];

  protected compositeActivities: Array<{
    activity: AdminActivity;
    entry: AdminActivityEntryData;
  }> = [];

  protected readonly filters = this.nnfb.group({
    types: this.nnfb.control<AdminActivityType[]>([]),
    user: new FormControl<User | null>(null)
  });

  protected loading: boolean;

  protected readonly pageChange = new Subject<PaginatorState>();
  protected first = 0;
  protected readonly rows = 10;
  protected totalRecords = 0;

  ngOnInit() {
    merge(
      of(null),
      this.filters.valueChanges,
      this.pageChange.pipe(tap(({ first }) => (this.first = first)))
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() => {
          const { types, user } = this.filters.value;
          const query = {
            take: this.rows,
            skip: this.first,
            filter: types.length > 0 ? types : undefined
          };

          return (
            this.adminService
              // If no user selected, get all admins' activities.
              .getAdminActivities(user?.id, query)
              .pipe(
                // This must be in an inner pipe, rather than the outer pipe to avoid
                // outer observable terminating on 400 (stopping subsequent search attempts).
                mapHttpError(400, { data: [], totalCount: -1, returnCount: 0 })
              )
          );
        })
      )
      .subscribe({
        next: (response) => {
          this.totalRecords = response.totalCount;
          this.compositeActivities = response.data.map((activity) => ({
            activity,
            entry: AdminActivityEntryComponent.getActivityData(activity)
          }));
          this.loading = false;
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to load admin activity',
            detail: httpError.error.message
          });
          this.compositeActivities = [];
          this.totalRecords = 0;
          this.loading = false;
        }
      });
  }
}
