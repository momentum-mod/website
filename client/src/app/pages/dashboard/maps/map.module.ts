import {NgModule} from '@angular/core';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {NotFoundModule} from '../../not-found/not-found.module';
import {MapComponent} from './map.component';
import {MapRoutingModule} from './map-routing.module';
import {ThemeModule} from '../../../@theme/theme.module';
import {GalleryModule} from '@ngx-gallery/core';
import {LightboxModule} from '@ngx-gallery/lightbox';
import {GallerizeModule} from '@ngx-gallery/gallerize';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {MapUploadFormComponent} from './upload-form/map-upload-form.component';
import {UploadStatusComponent} from './upload-status/upload-status.component';
import {MapInfoComponent} from './map-info/map-info.component';
import {MapNotifyEditComponent} from './map-info/map-info-notify-edit/map-info-notify-edit.component';
import {MarkdownModule} from 'ngx-markdown';
import {
  NbAlertModule,
  NbDatepickerModule,
  NbDialogModule,
  NbListModule,
  NbSelectModule,
  NbStepperModule,
  NbToggleModule,
} from '@nebular/theme';
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
import {MapListComponent} from './map-list/map-list.component';

@NgModule({
  imports: [
    ThemeModule,
    DragDropModule,
    NotFoundModule,
    NbDatepickerModule,
    NbListModule,
    NbSelectModule,
    NbStepperModule,
    NbAlertModule,
    NgxPaginationModule,
    GalleryModule,
    NbDialogModule.forChild(),
    LightboxModule.withConfig({
      panelClass: 'fullscreen',
    }),
    GallerizeModule,
    UserModule,
    MarkdownModule.forChild(),
    MapRoutingModule,
    NbToggleModule,
  ],
  declarations: [
    MapComponent,
    ViewMapsComponent,
    MapUploadFormComponent,
    UploadStatusComponent,
    MapInfoComponent,
    MapNotifyEditComponent,
    MapCreditsComponent,
    MapCreditComponent,
    FileUploadComponent,
    MapLeaderboardComponent,
    MapInfoDescriptionComponent,
    MapInfoCreditsComponent,
    MapInfoStatsComponent,
    MapListItemComponent,
    MapEditComponent,
    MapListComponent,
  ],
  providers: [],
})
export class MapModule { }
