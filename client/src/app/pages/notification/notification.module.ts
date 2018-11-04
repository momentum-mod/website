import {NgModule} from '@angular/core';
import {NotificationComponent} from './notification.component';
import {NbListModule} from '@nebular/theme';
import {CommonModule} from '@angular/common';
import {ActivityModule} from '../activity/activity.module';


@NgModule({
  imports: [CommonModule, NbListModule, ActivityModule],
  declarations: [NotificationComponent],
  exports: [NotificationComponent],
})
export class NotificationModule {}
