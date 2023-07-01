import { NgModule } from '@angular/core';
import { ActivityCardComponent } from './activity/activity-card/activity-card.component';
import { ActivityContentComponent } from './activity/activity-content/activity-content.component';
import { ActivityListComponent } from './activity/activity-list/activity-list.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { HeaderComponent } from './header/header.component';
import { NotificationComponent } from './notification/notification.component';
import { CreateReportDialogComponent } from './report/create-report-dialog/create-report-dialog.component';
import { ReportButtonComponent } from './report/report-button/report-button.component';
import { SearchInputComponent } from './search-input/search-input.component';
import { DeleteUserDialogComponent } from './delete-user-dialog/delete-user-dialog.component';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemeModule } from '@momentum/frontend/theme';
import { DirectivesModule } from '@momentum/frontend/directives';
import { PipesModule } from '@momentum/frontend/pipes';
import { RouterModule } from '@angular/router';
import { NbSearchModule } from './search/search.module';
import { UserSearchComponent } from './user-search/user-search.component';
import { UserSearchResultComponent } from './user-search/user-search-result.component';
import { NbFormFieldModule } from '@nebular/theme';
import { NgxPaginationModule } from 'ngx-pagination';

const COMPONENTS = [
  HeaderComponent,
  SearchInputComponent,
  NotificationComponent,
  ActivityCardComponent,
  ActivityContentComponent,
  ActivityListComponent,
  ReportButtonComponent,
  CreateReportDialogComponent,
  ConfirmDialogComponent,
  DeleteUserDialogComponent,
  UserSearchComponent,
  UserSearchResultComponent
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    ThemeModule.forRoot(),
    DirectivesModule,
    PipesModule,
    RouterModule,
    NbSearchModule,
    NbFormFieldModule,
    NgxPaginationModule
  ],
  exports: [...COMPONENTS, NbSearchModule],
  declarations: COMPONENTS
})
export class ComponentsModule {}
