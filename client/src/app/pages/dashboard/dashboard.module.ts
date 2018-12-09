import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgxEchartsModule} from 'ngx-echarts';
import {Ng2SmartTableModule} from 'ng2-smart-table';

import {ThemeModule} from '../../@theme/theme.module';
import {DashboardComponent} from './dashboard.component';

import {DashboardRoutingModule} from './dashboard-routing.module';
import {DashboardHomeComponent} from './home/dashboard-home.component';
import {NotFoundModule} from '../not-found/not-found.module';
import {SmartTableModule} from './smart-table/smart-table.module';
import {UserProfileComponent} from './profile/user-profile.component';
import {ProfileEditComponent} from './profile/profile-edit/profile-edit.component';
import {ToasterModule} from 'angular2-toaster';
import {MarkdownModule} from 'ngx-markdown';
import {NbAccordionModule, NbDialogModule} from '@nebular/theme';
import {
  ProfileFollowComponent,
  ProfileNotifyEditComponent,
} from './profile/profile-follow/profile-follow.component';
import {HomeStatsComponent} from './home/home-stats/home-stats.component';
import {HomeUserMapsComponent} from './home/home-user-maps/home-user-maps.component';
import {HomeUserLibraryComponent} from './home/home-user-library/home-user-library.component';
import {NgxPaginationModule} from 'ngx-pagination';
import {RunInfoComponent} from './runs/run-info/run-info.component';
import {DisqusModule} from 'ngx-disqus';
import { ProfileCreditsComponent } from './profile/profile-credits/profile-credits.component';

@NgModule({
  imports: [
    ThemeModule,
    NbAccordionModule,
    NgxEchartsModule,
    SmartTableModule,
    Ng2SmartTableModule,
    NbDialogModule.forChild(),
    ToasterModule.forChild(),
    MarkdownModule.forChild(),
    DisqusModule,
    FormsModule,
    NotFoundModule,
    NgxPaginationModule,
    DashboardRoutingModule,
  ],
  declarations: [
    DashboardComponent,
    DashboardHomeComponent,
    UserProfileComponent,
    ProfileEditComponent,
    ProfileFollowComponent,
    ProfileNotifyEditComponent,
    HomeStatsComponent,
    HomeUserMapsComponent,
    HomeUserLibraryComponent,
    RunInfoComponent,
    ProfileCreditsComponent,
  ],
  entryComponents: [
    ProfileNotifyEditComponent,
  ],
  providers: [],
})
export class DashboardModule { }
