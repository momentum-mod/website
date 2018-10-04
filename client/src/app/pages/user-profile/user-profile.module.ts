
import { UserProfileComponent } from './user-profile.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgModule } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Ng2SmartTableModule } from 'ng2-smart-table';
import { HeaderComponent } from '../../@theme/components/header/header.component';
import { FooterComponent } from '../../@theme/components/footer/footer.component';
import { ThemeModule } from '../../@theme/theme.module';
import { NbCardModule } from '@nebular/theme';
import {NbActionsModule} from '@nebular/theme';

import { ProfileCardComponent } from '../dashboard/profile-card/profile-card.component';

import {ActivityCardComponent} from '../dashboard/activity-card/activity-card.component';
import {NbActionComponent} from '@nebular/theme/components/actions/actions.component';


@NgModule({
  imports: [
    ThemeModule,
    NgxEchartsModule,
    NgxChartsModule,
    Ng2SmartTableModule,
    NbCardModule,
    NbActionsModule,
    NgbModule,

  ],
  declarations: [
    ProfileCardComponent,
    NbActionComponent,
    UserProfileComponent,
    HeaderComponent,
    FooterComponent,
    ActivityCardComponent,
  ],
  providers: [],
})
export class UserProfileModule {}
