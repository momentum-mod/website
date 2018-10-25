import { NgModule } from '@angular/core';

import {NotFoundModule} from '../../not-found/not-found.module';
import {MapComponent} from './map.component';
import {MapQueueComponent} from './map-queue/map-queue.component';
import {MapRoutingModule} from './map-routing.module';
import {ThemeModule} from '../../../@theme/theme.module';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {MapUploadFormComponent} from './upload-form/map-upload-form.component';
import {UploadStatusComponent} from './upload-status/upload-status.component';
import {MapInfoComponent} from './map-info/map-info.component';
import {MapStatusComponent} from './upload-status/map-status/map-status.component';
import {MarkdownModule} from 'ngx-markdown';

@NgModule({
  imports: [
    ThemeModule,
    NotFoundModule,
    MarkdownModule.forChild(),
    MapRoutingModule,
  ],
  declarations: [
    MapComponent,
    MapQueueComponent,
    ViewMapsComponent,
    MapUploadFormComponent,
    UploadStatusComponent,
    MapInfoComponent,
    MapStatusComponent,
  ],
  providers: [],
})
export class MapModule { }
