import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { MapsService } from '../../../../@core/data/maps.service';
import { MomentumMap } from '../../../../@core/models/momentum-map.model';
import { LocalUserService } from '../../../../@core/data/local-user.service';
import {
  Gallery,
  GalleryRef,
  GalleryConfig,
  ImageItem,
  YoutubeItem
} from '@ngx-gallery/core';
import { MapImage } from '../../../../@core/models/map-image.model';
import { Role } from '../../../../@core/models/role.model';
import { ReportType } from '../../../../@core/models/report-type.model';
import { MomentumMapPreview } from '../../../../@core/models/momentum-map-preview.model';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { Subject } from 'rxjs';
import { MapNotify } from '../../../../@core/models/map-notify.model';
import { MapNotifyEditComponent } from './map-info-notify-edit/map-info-notify-edit.component';

@Component({
  selector: 'mom-map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.scss']
})
export class MapInfoComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject<void>();
  @Input() previewMap: MomentumMapPreview;
  protected readonly ReportType = ReportType;
  map: MomentumMap;
  mapNotify: MapNotify;
  mapNotifications: boolean;
  mapInLibrary: boolean;
  mapInFavorites: boolean;
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  galleryConfig: GalleryConfig = {
    loadingMode: 'indeterminate',
    loadingStrategy: 'lazy',
    imageSize: 'cover',
    thumbMode: 'free',
    thumbHeight: 68,
    counter: false
  };
  lightboxConfig: GalleryConfig = {
    loadingMode: 'indeterminate',
    loadingStrategy: 'preload',
    thumb: false,
    counter: false,
    dots: true
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapsService,
    private locUserService: LocalUserService,
    private toastService: NbToastrService,
    private dialogService: NbDialogService,
    private gallery: Gallery
  ) {
    this.ReportType = ReportType;
    this.mapInLibrary = false;
    this.map = null;
    this.previewMap = null;
    this.mapInFavorites = false;
    this.mapNotify = null;
    this.mapNotifications = false;
  }

  ngOnInit() {
    const galleryRef = this.gallery.ref('image-gallery');
    const lightboxRef = this.gallery.ref('lightbox');

    galleryRef.setConfig(this.galleryConfig);
    lightboxRef.setConfig(this.lightboxConfig);

    if (this.previewMap) {
      this.map = this.previewMap.map;
      this.updateGallery(
        galleryRef,
        this.previewMap.images,
        this.previewMap.map.info.youtubeID
      );
    } else {
      this.route.paramMap
        .pipe(
          switchMap((params: ParamMap) =>
            this.mapService.getMap(Number(params.get('id')), {
              params: {
                expand:
                  'info,credits,submitter,stats,images,inFavorites,inLibrary,tracks'
              }
            })
          )
        )
        .subscribe((map) => {
          this.map = map;
          this.locUserService.checkMapNotify(this.map.id).subscribe({
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
          this.locUserService
            .getLocal()
            .pipe(takeUntil(this.ngUnsub))
            .subscribe((locUser) => {
              this.isAdmin = this.locUserService.hasRole(Role.ADMIN, locUser);
              this.isModerator = this.locUserService.hasRole(
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
      this.locUserService.removeMapFromLibrary(this.map.id).subscribe(() => {
        this.mapInLibrary = false;
        this.map.stats.totalSubscriptions--;
      });
    } else {
      this.locUserService.addMapToLibrary(this.map.id).subscribe({
        next: () => {
          this.mapInLibrary = true;
          this.map.stats.totalSubscriptions++;
        },
        error: (error) =>
          this.toastService.danger(error.message, 'Cannot add map to library')
      });
    }
  }

  onFavoriteUpdate() {
    if (this.mapInFavorites) {
      this.locUserService.removeMapFromFavorites(this.map.id).subscribe(() => {
        this.mapInFavorites = false;
        this.map.stats.totalFavorites--;
      });
    } else {
      this.locUserService.addMapToFavorites(this.map.id).subscribe({
        next: () => {
          this.mapInFavorites = true;
          this.map.stats.totalFavorites++;
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
          if (this.mapNotify === null) return;
          this.locUserService.disableMapNotify(this.map.id).subscribe({
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
          this.locUserService
            .updateMapNotify(this.map.id, response.newFlags)
            .subscribe({
              next: (response) => {
                this.mapNotifications = true;
                if (this.mapNotify == null) this.mapNotify = response;
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
