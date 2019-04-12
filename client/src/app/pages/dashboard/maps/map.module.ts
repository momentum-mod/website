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
import {MarkdownModule} from 'ngx-markdown';
import {MapLibraryComponent} from './map-library/map-library.component';
import {NbDatepickerModule, NbListModule, NbSelectModule, NbStepperModule} from '@nebular/theme';
import {MapCreditsComponent} from './map-credits/map-credits.component';
import {UserModule} from '../user/user.module';
import {MapCreditComponent} from './map-credits/map-credit/map-credit.component';
import {FileUploadComponent} from './upload-form/file-upload/file-upload.component';
import {MapLeaderboardComponent} from './map-info/map-leaderboard/map-leaderboard.component';
import {NgxPaginationModule} from 'ngx-pagination';
import {MapInfoDescriptionComponent} from './map-info/map-info-description/map-info-description.component';
import {MapInfoCreditsComponent} from './map-info/map-info-credits/map-info-credits.component';
import {MapInfoStatsComponent} from './map-info/map-info-stats/map-info-stats.component';
import {MapListItemComponent} from './map-list/map-list-item/map-list-item.component';
import {MapEditComponent} from './map-edit/map-edit.component';
import { MapFavoritesComponent } from './map-favorites/map-favorites.component';
import { MapListComponent } from './map-list/map-list.component';

@NgModule({
  imports: [
    ThemeModule,
    NotFoundModule,
    NbDatepickerModule,
    NbListModule,
    NbSelectModule,
    NbStepperModule,
    NgxPaginationModule,
    NgxGalleryModule,
    UserModule,
    MarkdownModule.forChild(),
    MapRoutingModule,
  ],
  declarations: [
    MapComponent,
    ViewMapsComponent,
    MapUploadFormComponent,
    UploadStatusComponent,
    MapInfoComponent,
    MapLibraryComponent,
    MapCreditsComponent,
    MapCreditComponent,
    FileUploadComponent,
    MapLeaderboardComponent,
    MapInfoDescriptionComponent,
    MapInfoCreditsComponent,
    MapInfoStatsComponent,
    MapListItemComponent,
    MapEditComponent,
    MapFavoritesComponent,
    MapListComponent,
  ],
  providers: [],
})
export class MapModule { }
