import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { NbDialogService } from '@nebular/theme';
import { Subject } from 'rxjs';
import { MapNotifyEditComponent } from './map-info-notify-edit/map-info-notify-edit.component';
import { MMap, MapImage, MapNotify, CombinedRoles } from '@momentum/constants';
import { ReportType } from '@momentum/constants';
import { LocalUserService, MapsService } from '@momentum/frontend/data';
import { PartialDeep } from 'type-fest';
import {
  Gallery,
  GalleryComponent,
  GalleryRef,
  ImageItem,
  YoutubeItem
} from 'ng-gallery';
import { MapInfoStatsComponent } from './map-info-stats/map-info-stats.component';
import { MapInfoCreditsComponent } from './map-info-credits/map-info-credits.component';
import { MapInfoDescriptionComponent } from './map-info-description/map-info-description.component';
import { SharedModule } from '../../../shared.module';
import { MapLeaderboardComponent } from './map-leaderboard/map-leaderboard.component';
import { GallerizeDirective } from 'ng-gallery/lightbox';
import { ReportButtonComponent } from '../../../components/report/report-button/report-button.component';
import { TooltipDirective } from '../../../directives/tooltip/tooltip.directive';
import { CardHeaderComponent } from '../../../components/card/card-header.component';
import { CardComponent } from '../../../components/card/card.component';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.css'],
  standalone: true,
  imports: [
    SharedModule,
    GalleryComponent,
    GallerizeDirective,
    MapLeaderboardComponent,
    MapInfoDescriptionComponent,
    MapInfoCreditsComponent,
    MapInfoStatsComponent,
    ReportButtonComponent,
    CardHeaderComponent,
    CardComponent,
    TooltipDirective
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
    private messageService: MessageService,
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
                this.messageService.add({
                  severity: 'error',
                  summary: 'Could not check if following',
                  detail: error.message
                });
            }
          });
          if (this.map.favorites && this.map.favorites.length > 0)
            this.mapInFavorites = true;
          if (this.map.libraryEntries && this.map.libraryEntries.length > 0)
            this.mapInLibrary = true;
          this.updateGallery(galleryRef, map.images, map.info.youtubeID);
          this.localUserService.localUserSubject
            .pipe(takeUntil(this.ngUnsub))
            .subscribe((locUser) => {
              this.isModerator = this.localUserService.hasRole(
                CombinedRoles.MOD_OR_ADMIN
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
          this.messageService.add({
            severity: 'danager',
            summary: 'Cannot add map to library',
            detail: error.message
          })
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
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to add map to favorites',
            detail: error.message
          })
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
              this.messageService.add({
                severity: 'error',
                summary: 'Could not disable notifications',
                detail: error.message
              })
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
                this.messageService.add({
                  severity: 'error',
                  summary: error.message,
                  detail: 'Could not enable notificaions'
                })
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
    this.router.navigate(['/maps/' + this.map.id + '/edit']);
  }
}
