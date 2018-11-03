import {NgModule} from '@angular/core';
import {NotificationComponent} from './notification.component';
import { ActivityContentComponent } from './activity-content/activity-content.component';
import {NbListModule, NbUserModule} from '@nebular/theme';
import {CommonModule} from '@angular/common';


@NgModule({
  imports: [CommonModule, NbListModule, NbUserModule],
  declarations: [NotificationComponent, ActivityContentComponent],
  exports: [NotificationComponent, ActivityContentComponent],
})
export class NotificationModule {}
