import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import {
  NbDialogService,
  NbToastrService,
  NbCardModule,
  NbButtonModule,
  NbIconModule,
  NbPopoverModule,
  NbTabsetModule,
  NbUserModule
} from '@nebular/theme';
import { Subject } from 'rxjs';
import { MapNotifyEditComponent } from './map-info-notify-edit/map-info-notify-edit.component';
import { MMap, MapImage, MapNotify } from '@momentum/constants';
import { ReportType, Role } from '@momentum/constants';
import { LocalUserService, MapsService } from '@momentum/frontend/data';
import { PartialDeep } from 'type-fest';
import {
  Gallery,
  GalleryRef,
  ImageItem,
  YoutubeItem,
  GalleryComponent
} from 'ng-gallery';
import { ThousandsSuffixPipe } from '../../../../../../../libs/frontend/pipes/src/lib/thousands-suffix.pipe';
import { PluralPipe } from '../../../../../../../libs/frontend/pipes/src/lib/plural.pipe';
import { MapLeaderboardComponent } from './map-leaderboard/map-leaderboard.component';
import { MapInfoStatsComponent } from './map-info-stats/map-info-stats.component';
import { MapInfoCreditsComponent } from './map-info-credits/map-info-credits.component';
import { MapInfoDescriptionComponent } from './map-info-description/map-info-description.component';
import { NbTabIconDirective } from '../../../../../../../libs/frontend/directives/src/lib/icons/nb-tab-icon.directive';
import { GallerizeDirective } from 'ng-gallery/lightbox';
import { NbIconIconDirective } from '../../../../../../../libs/frontend/directives/src/lib/icons/nb-icon-icon.directive';
import { ReportButtonComponent } from '../../../components/report/report-button/report-button.component';
import { NgIf, NgClass, DatePipe } from '@angular/common';

@Component({
  selector: 'mom-map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NbCardModule,
    ReportButtonComponent,
    NbButtonModule,
    NbIconModule,
    NbIconIconDirective,
    NbPopoverModule,
    GalleryComponent,
    GallerizeDirective,
    NbTabsetModule,
    NbTabIconDirective,
    MapInfoDescriptionComponent,
    MapInfoCreditsComponent,
    MapInfoStatsComponent,
    RouterLink,
    NbUserModule,
    NgClass,
    MapLeaderboardComponent,
    DatePipe,
    PluralPipe,
    ThousandsSuffixPipe
  ]
})
export class MapInfoComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject<void>();
  @Input() previewMap: PartialDeep<
    { map: MMap; images: MapImage[] },
    { recurseIntoArrays: true }
  >;
  protected readonly ReportType = ReportType;
  map: MMap;
  mapNotify: MapNotify;
  mapNotifications: boolean;
  mapInLibrary: boolean;
  mapInFavorites: boolean;
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapsService,
    private localUserService: LocalUserService,
    private toastService: NbToastrService,
    private dialogService: NbDialogService,
    private gallery: Gallery
  ) {
    this.ReportType = ReportType;
    this.mapInLibrary = false;
    this.map = undefined;
    this.previewMap = undefined;
    this.mapInFavorites = false;
    this.mapNotify = undefined;
    this.mapNotifications = false;
  }

  ngOnInit() {
    const galleryRef = this.gallery.ref('image-gallery');
    const lightboxRef = this.gallery.ref('lightbox');

    galleryRef.setConfig({
      loadingStrategy: 'lazy',
      imageSize: 'cover',
      thumbHeight: 68,
      counter: false
    });
    lightboxRef.setConfig({
      loadingStrategy: 'preload',
      thumb: false,
      counter: false,
      imageSize: 'contain',
      dots: true
    });

    if (this.previewMap) {
      this.map = this.previewMap.map as MMap;
      this.updateGallery(
        galleryRef,
        this.previewMap.images as MapImage[],
        this.previewMap.map.info.youtubeID
      );
    } else {
      this.route.paramMap
        .pipe(
          switchMap((params: ParamMap) =>
            this.mapService.getMap(Number(params.get('id')), {
              expand: [
                'info',
                'zones',
                'leaderboards',
                'credits',
                'submitter',
                'stats',
                'images',
                'inFavorites',
                'inLibrary'
              ]
            })
          )
        )
        .subscribe((map) => {
          this.map = map;
          this.localUserService.checkMapNotify(this.map.id).subscribe({
            next: (resp) => {
              this.mapNotify = resp;
              if (resp) this.mapNotifications = true;
            },
            error: (error) => {
              if (error.status !== 404)
                this.toastService.danger(
                  error.message,
                  'Could not check if following'
                );
            }
          });
          if (this.map.favorites && this.map.favorites.length > 0)
            this.mapInFavorites = true;
          if (this.map.libraryEntries && this.map.libraryEntries.length > 0)
            this.mapInLibrary = true;
          this.updateGallery(galleryRef, map.images, map.info.youtubeID);
          this.localUserService
            .getLocal()
            .pipe(takeUntil(this.ngUnsub))
            .subscribe((locUser) => {
              this.isAdmin = this.localUserService.hasRole(Role.ADMIN, locUser);
              this.isModerator = this.localUserService.hasRole(
                Role.MODERATOR,
                locUser
              );
              this.isSubmitter = this.map.submitterID === locUser.id;
            });
        });
    }
  }

  ngOnDestroy(): void {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }

  onLibraryUpdate() {
    if (this.mapInLibrary) {
      this.localUserService.removeMapFromLibrary(this.map.id).subscribe(() => {
        this.mapInLibrary = false;
        this.map.stats.subscriptions--;
      });
    } else {
      this.localUserService.addMapToLibrary(this.map.id).subscribe({
        next: () => {
          this.mapInLibrary = true;
          this.map.stats.subscriptions++;
        },
        error: (error) =>
          this.toastService.danger(error.message, 'Cannot add map to library')
      });
    }
  }

  onFavoriteUpdate() {
    if (this.mapInFavorites) {
      this.localUserService
        .removeMapFromFavorites(this.map.id)
        .subscribe(() => {
          this.mapInFavorites = false;
          this.map.stats.favorites--;
        });
    } else {
      this.localUserService.addMapToFavorites(this.map.id).subscribe({
        next: () => {
          this.mapInFavorites = true;
          this.map.stats.favorites++;
        },
        error: (error) =>
          this.toastService.danger(
            error.message,
            'Failed to add map to favorites'
          )
      });
    }
  }

  editNotificationSettings() {
    this.dialogService
      .open(MapNotifyEditComponent, {
        context: {
          flags: this.mapNotify ? this.mapNotify.notifyOn : 0
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        if (response.newFlags === 0) {
          if (!this.mapNotify) return;
          this.localUserService.disableMapNotify(this.map.id).subscribe({
            next: () => {
              this.mapNotify.notifyOn = 0;
              this.mapNotifications = false;
            },
            error: (error) =>
              this.toastService.danger(
                'Could not disable notifications',
                error.message
              )
          });
        } else {
          this.localUserService
            .updateMapNotify(this.map.id, response.newFlags)
            .subscribe({
              next: (response) => {
                this.mapNotifications = true;
                if (!this.mapNotify) this.mapNotify = response;
                else this.mapNotify.notifyOn = response.newFlags;
              },
              error: (error) =>
                this.toastService.danger(
                  'Could not enable notificaions',
                  error.message
                )
            });
        }
      });
  }

  updateGallery(
    galleryRef: GalleryRef,
    mapImages: MapImage[],
    youtubeID?: string
  ) {
    const galleryItems = [];

    if (youtubeID) {
      galleryItems.push(new YoutubeItem({ src: youtubeID }));
    }

    for (const mapImage of mapImages) {
      galleryItems.push(
        new ImageItem({
          src: mapImage.large,
          thumb: mapImage.small
        })
      );
    }

    galleryRef.load(galleryItems);
  }

  onEditMap() {
    this.router.navigate(['/dashboard/maps/' + this.map.id + '/edit']);
  }
}
