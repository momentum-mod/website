import { NgModule } from '@angular/core';

import {NotFoundModule} from '../../not-found/not-found.module';
import {MapComponent} from './map.component';
import {MapQueueComponent} from './map-queue/map-queue.component';
import {MapRoutingModule} from './map-routing.module';
import {ThemeModule} from '../../../@theme/theme.module';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {UploadsComponent} from './uploads/uploads.component';
import {UploadStatusComponent} from './upload-status/upload-status.component';
import {MapInfoComponent} from './map-info/map-info.component';
import {ToasterModule} from 'angular2-toaster';

@NgModule({
  imports: [
    ThemeModule,
    NotFoundModule,
    MapRoutingModule,
    ToasterModule.forRoot(),
  ],
  declarations: [
    MapComponent,
    MapQueueComponent,
    ViewMapsComponent,
    UploadsComponent,
    UploadStatusComponent,
    MapInfoComponent,
  ],
  providers: [],
})
export class MapModule { }
