import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {switchMap} from 'rxjs/operators';
import {MapsService} from '../../../../@core/data/maps.service';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';
import {NgxGalleryAnimation, NgxGalleryImage, NgxGalleryOptions} from 'ngx-gallery';
import {MapImage} from '../../../../@core/models/map-image.model';
import {Permission} from '../../../../@core/models/permissions.model';


@Component({
  selector: 'map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.scss'],
})

export class MapInfoComponent implements OnInit {

  @ViewChild('leaderboard') leaderboard;
  @Input('previewMap') previewMap: MomentumMap;
  @Input('previewImage') previewImage;
  @Input('isPreview') isPreview: boolean;
  map: MomentumMap;
  mapInLibrary: boolean;
  mapInFavorites: boolean;
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  galleryOptions: NgxGalleryOptions[];
  galleryImages: NgxGalleryImage[];

  constructor(private route: ActivatedRoute,
              private router: Router,
              private mapService: MapsService,
              private locUserService: LocalUserService,
              private toastService: ToasterService) {
    this.mapInLibrary = false;
    this.isPreview = false;
    this.map = null;
    this.previewMap = null;
    this.previewImage = null;
    this.mapInFavorites = false;
    this.galleryOptions = [
      {
        width: '100%',
        height: '400px',
        thumbnailsColumns: 4,
        imageAnimation: NgxGalleryAnimation.Slide,
        previewCloseOnClick: true,
        previewCloseOnEsc: true,
      },
      // max-width 800
      {
        breakpoint: 800,
        width: '100%',
        height: '300px',
        imagePercent: 80,
        thumbnailsPercent: 20,
        thumbnailsMargin: 20,
        thumbnailMargin: 20,
      },
      // max-width 400
      {
        breakpoint: 400,
        preview: false,
      },
    ];
    this.galleryImages = [];
  }

  ngOnInit() {
    if (this.isPreview) {
      this.galleryImages.push({
        small: this.previewImage.dataBlobURL,
        medium: this.previewImage.dataBlobURL,
        big: this.previewImage.dataBlobURL,
      });
    } else {
      this.route.paramMap.pipe(
        switchMap((params: ParamMap) =>
          this.mapService.getMap(Number(params.get('id')), {
            params: {expand: 'info,credits,submitter,stats,images,inFavorites,inLibrary'},
          }),
        ),
      ).subscribe(map => {
        this.map = map;
        if (this.map.favorites && this.map.favorites.length)
          this.mapInFavorites = true;
        if (this.map.libraryEntries && this.map.libraryEntries.length)
          this.mapInLibrary = true;
        this.updateGalleryImages(map.images);
        this.leaderboard.loadLeaderboardRuns(map.id);
        this.locUserService.getLocal().subscribe(locUser => {
          this.isAdmin = this.locUserService.hasPermission(Permission.ADMIN, locUser);
          this.isModerator = this.locUserService.hasPermission(Permission.MODERATOR, locUser);
          this.isSubmitter = this.map.submitterID === locUser.id;
        });
      });
    }
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
        this.toastService.popAsync('error', 'Cannot add map to library', error.message);
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
        this.toastService.popAsync('error', 'Failed to add map to favorites', error.message);
      });
    }
  }

  updateGalleryImages(mapImages: MapImage[]) {
    this.galleryImages = [];
    for (let i = 0; i < mapImages.length; i++) {
      this.galleryImages.push({
        small: mapImages[i].small,
        medium: mapImages[i].medium,
        big: mapImages[i].large,
      });
    }
  }

  onEditMap() {
    this.router.navigate(['/dashboard/maps/' + this.map.id + '/edit']);
  }

}
