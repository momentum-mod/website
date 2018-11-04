import {NgModule} from '@angular/core';
import {ActivityContentComponent} from './activity-content/activity-content.component';
import {ActivityCardComponent} from './activity-card/activity-card.component';
import {NbCardModule, NbListModule, NbUserModule} from '@nebular/theme';
import {CommonModule} from '@angular/common';


@NgModule({
  imports: [
    CommonModule,
    NbCardModule,
    NbListModule,
    NbUserModule,
  ],
  declarations: [ActivityContentComponent, ActivityCardComponent],
  exports: [ActivityContentComponent, ActivityCardComponent],
})
export class ActivityModule {}
