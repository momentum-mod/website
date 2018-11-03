import {NgModule} from '@angular/core';
import {NotificationComponent} from './notification.component';
import { ActivityContentComponent } from './activity-content/activity-content.component';


@NgModule({
  declarations: [NotificationComponent, ActivityContentComponent],
  exports: [NotificationComponent, ActivityContentComponent],
})
export class NotificationModule {}
