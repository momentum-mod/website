import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgxEchartsModule} from 'ngx-echarts';
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {Ng2SmartTableModule} from 'ng2-smart-table';
import {ChartModule} from 'angular2-chartjs';

import {ThemeModule} from '../../@theme/theme.module';
import {DashboardComponent} from './dashboard.component';

import {DashboardRoutingModule} from './dashboard-routing.module';
import {DashboardHomeComponent} from './home/dashboard-home.component';
import {UserListComponent} from './user-list/user-list.component';
import {NotFoundModule} from '../not-found/not-found.module';
import {SmartTableModule} from './smart-table/smart-table.module';
import {UserEditModalComponent} from './user-list/user-edit-modal/user-edit-modal.component';
import {UserProfileComponent} from './profile/user-profile.component';
import {ProfileInfoComponent} from './profile/profile-info/profile-info.component';
import {ProfileEditComponent} from './profile/profile-edit/profile-edit.component';
import {ToasterModule} from 'angular2-toaster';
import {MarkdownModule} from 'ngx-markdown';
import {NbAccordionModule, NbDialogModule} from '@nebular/theme';
import {
  ProfileFollowComponent,
  ProfileNotifyEditComponent,
} from './profile/profile-info/profile-follow/profile-follow.component';
import {AdminModule} from './admin/admin.module';
import {HomeStatsComponent} from './home/home-stats/home-stats.component';
import {HomeUserMapsComponent} from './home/home-user-maps/home-user-maps.component';
import {HomeUserLibraryComponent} from './home/home-user-library/home-user-library.component';
import {NgxPaginationModule} from 'ngx-pagination';
import { RunInfoComponent } from './runs/run-info/run-info.component';

@NgModule({
  imports: [
    ThemeModule,
    NbAccordionModule,
    ChartModule,
    NgxEchartsModule,
    NgxChartsModule,
    SmartTableModule,
    Ng2SmartTableModule,
    NbDialogModule.forChild(),
    ToasterModule.forChild(),
    MarkdownModule.forChild(),
    FormsModule,
    NotFoundModule,
    DashboardRoutingModule,
    AdminModule,
    NgxPaginationModule,
  ],
  declarations: [
    DashboardComponent,
    DashboardHomeComponent,
    UserListComponent,
    UserEditModalComponent,
    UserProfileComponent,
    ProfileInfoComponent,
    ProfileEditComponent,
    ProfileFollowComponent,
    ProfileNotifyEditComponent,
    HomeStatsComponent,
    HomeUserMapsComponent,
    HomeUserLibraryComponent,
    RunInfoComponent,
  ],
  entryComponents: [
    UserEditModalComponent,
    ProfileNotifyEditComponent,
  ],
  providers: [],
})
export class DashboardModule { }
