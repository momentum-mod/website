import { NgModule } from '@angular/core';

import {NotFoundModule} from '../../not-found/not-found.module';
import {MapComponent} from './map.component';
import {MapQueueComponent} from './map-queue/map-queue.component';
import {MapRoutingModule} from './map-routing.module';
import {ThemeModule} from '../../../@theme/theme.module';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {UploadMapComponent} from './upload-map/upload-map.component';

@NgModule({
  imports: [
    ThemeModule,
    NotFoundModule,
    MapRoutingModule,
  ],
  declarations: [
    MapComponent, MapQueueComponent, ViewMapsComponent, UploadMapComponent,
  ],
  exports: [MapComponent, MapQueueComponent],
  providers: [],
})
export class MapModule { }
