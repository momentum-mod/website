import {NgModule} from '@angular/core';

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
import {MapLibraryComponent} from './map-library/map-library.component';
import {QueuedMapComponent} from './map-queue/queued-map/queued-map.component';
import {NbDatepickerModule, NbListModule, NbStepperModule} from '@nebular/theme';
import {MapCreditsComponent} from './map-credits/map-credits.component';
import {UserModule} from '../user/user.module';
import {MapCreditComponent} from './map-credits/map-credit/map-credit.component';
import {FileUploadComponent} from './upload-form/file-upload/file-upload.component';
import { MapLeaderboardComponent } from './map-info/map-leaderboard/map-leaderboard.component';

@NgModule({
  imports: [
    ThemeModule,
    NotFoundModule,
    NbDatepickerModule,
    NbListModule,
    NbStepperModule,
    UserModule,
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
    MapLibraryComponent,
    QueuedMapComponent,
    MapCreditsComponent,
    MapCreditComponent,
    FileUploadComponent,
    MapLeaderboardComponent,
  ],
  providers: [],
})
export class MapModule { }
