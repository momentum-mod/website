import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Ng2SmartTableModule } from 'ng2-smart-table';
import { ChartModule } from 'angular2-chartjs';

import { ThemeModule } from '../../@theme/theme.module';
import { DashboardComponent } from './dashboard.component';

import {DashboardRoutingModule} from './dashboard-routing.module';
import {DashboardHomeComponent} from './home/dashboard-home.component';
import {UserListComponent} from './user-list/user-list.component';
import {CommunityListComponent} from './community/community-list.component';
import {NotFoundModule} from '../not-found/not-found.module';
import {SmartTableModule} from './smart-table/smart-table.module';
import { UserEditModalComponent } from './user-list/user-edit-modal/user-edit-modal.component';
import {CommunityHomeComponent} from './community/community-home/community-home.component';
import {ProfileCardComponent} from './profile/profile-card/profile-card.component';
import {UserProfileComponent} from './profile/user-profile.component';
import {ProfileInfoComponent} from './profile/profile-info/profile-info.component';
import {ProfileEditComponent} from './profile/profile-edit/profile-edit.component';
import {ToasterModule} from 'angular2-toaster';
import {MarkdownModule} from 'ngx-markdown';
import {NbDialogModule} from '@nebular/theme';
import {
  ProfileFollowComponent,
  ProfileNotifyEditComponent,
} from './profile/profile-info/profile-follow/profile-follow.component';
import { CommunityNewsComponent } from './community/community-news/community-news.component';
import { CommunityTwitchStreamComponent } from './community/community-twitch-stream/community-twitch-stream.component';
import { CommunityActivityComponent } from './community/community-activity/community-activity.component';

@NgModule({
  imports: [
    ThemeModule,
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
  ],
  declarations: [
    DashboardComponent,
    DashboardHomeComponent,
    CommunityHomeComponent,
    CommunityListComponent,
    UserListComponent,
    UserEditModalComponent,
    ProfileCardComponent,
    UserProfileComponent,
    ProfileInfoComponent,
    ProfileEditComponent,
    ProfileFollowComponent,
    ProfileNotifyEditComponent,
    CommunityNewsComponent,
    CommunityTwitchStreamComponent,
    CommunityActivityComponent,
  ],
  entryComponents: [
    UserEditModalComponent,
    ProfileNotifyEditComponent,
  ],
  providers: [],
})
export class DashboardModule { }
