import {NgModule} from '@angular/core';

import {NotFoundModule} from '../../not-found/not-found.module';
import {MapComponent} from './map.component';
import {MapRoutingModule} from './map-routing.module';
import {ThemeModule} from '../../../@theme/theme.module';
import {NgxGalleryModule} from 'ngx-gallery';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {MapUploadFormComponent} from './upload-form/map-upload-form.component';
import {UploadStatusComponent} from './upload-status/upload-status.component';
import {MapInfoComponent} from './map-info/map-info.component';
import {MapStatusComponent} from './upload-status/map-status/map-status.component';
import {MarkdownModule} from 'ngx-markdown';
import {MapLibraryComponent} from './map-library/map-library.component';
import {NbDatepickerModule, NbListModule, NbStepperModule} from '@nebular/theme';
import {MapCreditsComponent} from './map-credits/map-credits.component';
import {UserModule} from '../user/user.module';
import {MapCreditComponent} from './map-credits/map-credit/map-credit.component';
import {FileUploadComponent} from './upload-form/file-upload/file-upload.component';
import { MapLeaderboardComponent } from './map-info/map-leaderboard/map-leaderboard.component';
import {NgxPaginationModule} from 'ngx-pagination';
import { MapInfoDescriptionComponent } from './map-info/map-info-description/map-info-description.component';
import { MapInfoCreditsComponent } from './map-info/map-info-credits/map-info-credits.component';
import { MapInfoStatsComponent } from './map-info/map-info-stats/map-info-stats.component';
import { MapListItemComponent } from './view-maps/map-list-item/map-list-item.component';

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
    NgxPaginationModule,
    NgxGalleryModule,
  ],
  declarations: [
    MapComponent,
    ViewMapsComponent,
    MapUploadFormComponent,
    UploadStatusComponent,
    MapInfoComponent,
    MapStatusComponent,
    MapLibraryComponent,
    MapCreditsComponent,
    MapCreditComponent,
    FileUploadComponent,
    MapLeaderboardComponent,
    MapInfoDescriptionComponent,
    MapInfoCreditsComponent,
    MapInfoStatsComponent,
    MapListItemComponent,
  ],
  providers: [],
})
export class MapModule { }
