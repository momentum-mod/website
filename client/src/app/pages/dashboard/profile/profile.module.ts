import {NgModule} from '@angular/core';
import {UserProfileComponent} from './user-profile.component';
import {ProfileEditComponent} from './profile-edit/profile-edit.component';
import {ProfileFollowComponent, ProfileNotifyEditComponent} from './profile-follow/profile-follow.component';
import {ProfileCreditsComponent} from './profile-credits/profile-credits.component';
import {ProfileRunHistoryComponent} from './profile-run-history/profile-run-history.component';
import {ProfileRoutingModule} from './profile-routing.module';
import {NotFoundModule} from '../../not-found/not-found.module';
import {ProfileComponent} from './profile.component';
import {ThemeModule} from '../../../@theme/theme.module';
import {NbAccordionModule, NbDialogModule} from '@nebular/theme';
import {NgxEchartsModule} from 'ngx-echarts';
import {ToasterModule} from 'angular2-toaster';
import {MarkdownModule} from 'ngx-markdown';
import {FormsModule} from '@angular/forms';
import {NgxPaginationModule} from 'ngx-pagination';
import {UserModule} from '../user/user.module';

@NgModule({
  imports: [
    ThemeModule,
    NbAccordionModule,
    NgxEchartsModule,
    NbDialogModule.forChild(),
    ToasterModule.forChild(),
    MarkdownModule.forChild(),
    FormsModule,
    NgxPaginationModule,
    NotFoundModule,
    ProfileRoutingModule,
    UserModule,
  ],
  declarations: [
    ProfileComponent,
    UserProfileComponent,
    ProfileEditComponent,
    ProfileFollowComponent,
    ProfileNotifyEditComponent,
    ProfileCreditsComponent,
    ProfileRunHistoryComponent,
  ],
  providers: [],
  entryComponents: [
    ProfileNotifyEditComponent,
  ],
})
export class ProfileModule {}
