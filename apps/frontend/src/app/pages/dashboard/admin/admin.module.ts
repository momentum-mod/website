import { NgModule } from '@angular/core';

import { NotFoundModule } from '../../not-found/not-found.module';
import { MapQueueComponent } from './map-queue/map-queue.component';
import { ThemeModule } from '../../../@theme/theme.module';
import { QueuedMapComponent } from './map-queue/queued-map/queued-map.component';
import { AdminComponent } from './admin.component';
import { AdminRoutingModule } from './admin-routing.module';
import { NgxPaginationModule } from 'ngx-pagination';
import { ReportQueueComponent } from './report-queue/report-queue.component';
import { QueuedReportComponent } from './report-queue/queued-report/queued-report.component';
import { UpdateReportDialogComponent } from './report-queue/update-report-dialog/update-report-dialog.component';
import { NbDialogModule } from '@nebular/theme';
import { UtilitiesComponent } from './utilities/utilities.component';
import { XPSystemComponent } from './xp-system/xp-system.component';

@NgModule({
  imports: [
    ThemeModule,
    NotFoundModule,
    AdminRoutingModule,
    NgxPaginationModule,
    NbDialogModule.forChild()
  ],
  declarations: [
    MapQueueComponent,
    AdminComponent,
    QueuedMapComponent,
    ReportQueueComponent,
    QueuedReportComponent,
    UpdateReportDialogComponent,
    UtilitiesComponent,
    XPSystemComponent
  ],
  providers: []
})
export class AdminModule {}
