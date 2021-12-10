import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {switchMap, takeUntil} from 'rxjs/operators';
import {MapsService} from '../../../../@core/data/maps.service';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {Gallery, GalleryRef, GalleryConfig, ImageItem, YoutubeItem} from '@ngx-gallery/core';
import {MapImage} from '../../../../@core/models/map-image.model';
import {Role} from '../../../../@core/models/role.model';
import {ReportType} from '../../../../@core/models/report-type.model';
import {MomentumMapPreview} from '../../../../@core/models/momentum-map-preview.model';
import {NbDialogService, NbToastrService} from '@nebular/theme';
import {Subject} from 'rxjs';
import {MapNotify} from '../../../../@core/models/map-notify.model';
import {MapNotifyEditComponent} from './map-info-notify-edit/map-info-notify-edit.component';
import {MapUploadStatus} from '../../../../@core/models/map-upload-status.model';

@Component({
  selector: 'map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.scss'],
})

export class MapInfoComponent implements OnInit, OnDestroy {

  private ngUnsub = new Subject();
  @Input('previewMap') previewMap: MomentumMapPreview;
  ReportType: typeof ReportType;
  map: MomentumMap;
  mapStatuses: Object;
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
    counter: false,
  };
  lightboxConfig: GalleryConfig = {
    loadingMode: 'indeterminate',
    loadingStrategy: 'preload',
    thumb: false,
    counter: false,
    dots: true,
  };

  constructor(private route: ActivatedRoute,
              private router: Router,
              private mapService: MapsService,
              private locUserService: LocalUserService,
              private toastService: NbToastrService,
              private dialogService: NbDialogService,
              private gallery: Gallery) {
    this.ReportType = ReportType;
    this.mapInLibrary = false;
    this.map = null;
    this.mapStatuses = MapUploadStatus;
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
      this.updateGallery(galleryRef, this.previewMap.images, this.previewMap.map.info.youtubeID);
    } else {
      this.route.paramMap.pipe(
        switchMap((params: ParamMap) =>
          this.mapService.getMap(Number(params.get('id')), {
            params: {expand: 'info,credits,submitter,stats,images,inFavorites,inLibrary,tracks'},
          }),
        ),
      ).subscribe(map => {
        this.map = map;
        this.locUserService.checkMapNotify(this.map.id).subscribe(resp => {
          this.mapNotify = resp;
          if (resp)
            this.mapNotifications = true;
        }, err => {
          if (err.status !== 404)
            this.toastService.danger(err.message, 'Could not check if following');
        });
        if (this.map.favorites && this.map.favorites.length)
          this.mapInFavorites = true;
        if (this.map.libraryEntries && this.map.libraryEntries.length)
          this.mapInLibrary = true;
        this.updateGallery(galleryRef, map.images, map.info.youtubeID);
        this.locUserService.getLocal().pipe(
          takeUntil(this.ngUnsub),
        ).subscribe(locUser => {
          this.isAdmin = this.locUserService.hasRole(Role.ADMIN, locUser);
          this.isModerator = this.locUserService.hasRole(Role.MODERATOR, locUser);
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
      this.locUserService.addMapToLibrary(this.map.id).subscribe(resp => {
        this.mapInLibrary = true;
        this.map.stats.totalSubscriptions++;
      }, error => {
        this.toastService.danger(error.message, 'Cannot add map to library');
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
      this.locUserService.addMapToFavorites(this.map.id).subscribe(resp => {
        this.mapInFavorites = true;
        this.map.stats.totalFavorites++;
      }, error => {
        this.toastService.danger(error.message, 'Failed to add map to favorites');
      });
    }
  }

  editNotificationSettings() {
    this.dialogService.open(MapNotifyEditComponent, {
      context: {
        flags: (this.mapNotify ? this.mapNotify.notifyOn : 0),
      },
    }).onClose.subscribe(resp => {
      if (resp) {
        if (resp.newFlags === 0) {
          if (this.mapNotify != null) {
            this.locUserService.disableMapNotify(this.map.id).subscribe(() => {
              this.mapNotify.notifyOn = 0;
              this.mapNotifications = false;
            }, err => {
              this.toastService.danger('Could not disable notifications', err.message);
            });
          }
        } else {
          this.locUserService.updateMapNotify(this.map.id, resp.newFlags).subscribe(res => {
            this.mapNotifications = true;
            if (this.mapNotify == null)
              this.mapNotify = res;
            else
              this.mapNotify.notifyOn = resp.newFlags;
          }, (err) => {
            this.toastService.danger('Could not enable notificaions', err.message);
          });
        }
      }
    });
  }

  updateGallery(galleryRef: GalleryRef, mapImages: MapImage[], youtubeID?: string) {
    const galleryItems = [];

    if (youtubeID) {
      galleryItems.push(new YoutubeItem({src: youtubeID}));
    }

    for (let i = 0; i < mapImages.length; i++) {
      galleryItems.push(new ImageItem({
        src: mapImages[i].large,
        thumb: mapImages[i].small,
      }));
    }

    galleryRef.load(galleryItems);
  }

  onEditMap() {
    this.router.navigate(['/dashboard/maps/' + this.map.id + '/edit']);
  }

}
